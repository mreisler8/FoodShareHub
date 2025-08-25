import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

interface TraceLog {
  t: "trace";
  timestamp: string;
  path: string;
  method: string;
  rid: number | null;
  placeId: string | null;
  userId: number | null;
  op: "ratings.read" | "ratings.write" | "circleScore.read" | "restaurant.detail" | "identity.resolve";
  cacheHit: boolean | null;
  source: "db" | "places" | "cache" | "fallback";
  ms: number;
  note: string;
}

const TRACE_LOG_FILE = path.join(process.cwd(), 'logs', 'restaurant-audit.jsonl');

// Ensure logs directory exists
try {
  fs.mkdirSync(path.dirname(TRACE_LOG_FILE), { recursive: true });
} catch (error) {
  // Directory might already exist
}

export function writeTraceLog(trace: Omit<TraceLog, 't' | 'timestamp'>) {
  const logEntry: TraceLog = {
    t: "trace",
    timestamp: new Date().toISOString(),
    ...trace
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(TRACE_LOG_FILE, logLine);
  } catch (error) {
    console.error('Failed to write trace log:', error);
  }
}

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Capture original end function
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk?: any, encoding?: BufferEncoding, cb?: () => void) {
    const duration = Date.now() - startTime;
    
    // Only trace restaurant/ratings/circle score related requests
    if (shouldTrace(req.path)) {
      const { restaurantId, googlePlaceId } = extractIdentifiers(req);
      const operation = determineOperation(req.path, req.method);
      
      writeTraceLog({
        path: req.path,
        method: req.method,
        rid: restaurantId,
        placeId: googlePlaceId,
        userId: req.user?.id || null,
        op: operation,
        cacheHit: req.traceContext?.cacheHit || null,
        source: req.traceContext?.source || "db",
        ms: duration,
        note: req.traceContext?.note || ""
      });
    }
    
    // Call original end function with proper arguments
    return originalEnd(chunk, encoding, cb);
  };
  
  next();
}

function shouldTrace(path: string): boolean {
  const tracePaths = [
    '/api/restaurants/',
    '/api/ratings/',
    '/api/restaurant/',
    '/api/circle-score'
  ];
  
  return tracePaths.some(tracePath => path.includes(tracePath));
}

function extractIdentifiers(req: Request): { restaurantId: number | null, googlePlaceId: string | null } {
  let restaurantId: number | null = null;
  let googlePlaceId: string | null = null;
  
  // Extract from params
  if (req.params.id && !isNaN(parseInt(req.params.id))) {
    restaurantId = parseInt(req.params.id);
  }
  if (req.params.restaurantId && !isNaN(parseInt(req.params.restaurantId))) {
    restaurantId = parseInt(req.params.restaurantId);
  }
  if (req.params.googlePlaceId) {
    googlePlaceId = req.params.googlePlaceId;
  }
  
  // Extract from query
  if (req.query.restaurantId && !isNaN(parseInt(req.query.restaurantId as string))) {
    restaurantId = parseInt(req.query.restaurantId as string);
  }
  if (req.query.googlePlaceId) {
    googlePlaceId = req.query.googlePlaceId as string;
  }
  
  // Extract from body
  if (req.body?.restaurantId && !isNaN(parseInt(req.body.restaurantId))) {
    restaurantId = parseInt(req.body.restaurantId);
  }
  if (req.body?.googlePlaceId) {
    googlePlaceId = req.body.googlePlaceId;
  }
  
  return { restaurantId, googlePlaceId };
}

function determineOperation(path: string, method: string): TraceLog['op'] {
  if (path.includes('/ratings/')) {
    return method === 'GET' ? 'ratings.read' : 'ratings.write';
  }
  if (path.includes('/circle-score')) {
    return 'circleScore.read';
  }
  if (path.includes('/restaurants/')) {
    return 'restaurant.detail';
  }
  if (path.includes('/identity/')) {
    return 'identity.resolve';
  }
  
  return 'restaurant.detail';
}

// Helper function for handlers to update trace context
export function updateTraceContext(req: Request, updates: Partial<Pick<TraceLog, 'cacheHit' | 'source' | 'note'>>) {
  // Store in request object for end handler to pick up
  if (!req.traceContext) {
    req.traceContext = {};
  }
  Object.assign(req.traceContext, updates);
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      traceContext?: Partial<Pick<TraceLog, 'cacheHit' | 'source' | 'note'>>;
    }
  }
}

export function getTraceLogPath(): string {
  return TRACE_LOG_FILE;
}