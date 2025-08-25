import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';

interface ForensicsTrace {
  t: 'trace';
  op: 'ratings.read' | 'ratings.write' | 'circleScore.read' | 'restaurant.read';
  path: string;
  restaurantId?: number;
  placeId?: string;
  userId?: number;
  cacheHit: boolean;
  status: number;
  ms: number;
  note: string;
  timestamp: string;
}

const FORENSICS_LOG_PATH = path.join(process.cwd(), 'logs', 'restaurant-forensics.jsonl');

// Ensure logs directory exists
async function ensureLogsDir() {
  try {
    await fs.mkdir(path.dirname(FORENSICS_LOG_PATH), { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

// Write trace to JSONL file
async function writeTrace(trace: ForensicsTrace) {
  try {
    await ensureLogsDir();
    const line = JSON.stringify(trace) + '\n';
    await fs.appendFile(FORENSICS_LOG_PATH, line);
  } catch (err) {
    console.error('Failed to write forensics trace:', err);
  }
}

// Extract restaurant/place identifiers from request
function extractIdentifiers(req: Request): { restaurantId?: number; placeId?: string } {
  const { restaurantId, googlePlaceId, placeId } = req.params;
  const queryRestaurantId = req.query.restaurantId as string;
  const queryPlaceId = req.query.googlePlaceId as string;
  const bodyRestaurantId = req.body?.restaurantId;
  const bodyPlaceId = req.body?.googlePlaceId;

  return {
    restaurantId: restaurantId ? parseInt(restaurantId) : 
                  queryRestaurantId ? parseInt(queryRestaurantId) :
                  bodyRestaurantId ? parseInt(bodyRestaurantId) : undefined,
    placeId: googlePlaceId || placeId || queryPlaceId || bodyPlaceId || undefined
  };
}

// Determine operation type from path
function getOperationType(method: string, path: string): ForensicsTrace['op'] | null {
  if (path.includes('/api/ratings')) {
    return method === 'GET' ? 'ratings.read' : 'ratings.write';
  }
  if (path.includes('/api/circle-score') || path.includes('/circle-score')) {
    return 'circleScore.read';
  }
  if (path.includes('/api/restaurants')) {
    return 'restaurant.read';
  }
  return null;
}

/**
 * FORENSICS TRACING MIDDLEWARE
 * Logs all restaurant-related requests for debugging data flow issues
 */
export function forensicsTracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const operationType = getOperationType(req.method, req.path);
  
  // Only trace restaurant-related endpoints
  if (!operationType) {
    return next();
  }

  const identifiers = extractIdentifiers(req);
  const userId = (req as any).user?.id;

  // Intercept response to capture final status
  const originalSend = res.send;
  res.send = function(body: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Determine cache hit from various sources
    let cacheHit = false;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        cacheHit = parsed.cached === true || parsed.cacheHit === true;
      } catch {}
    }

    // Generate note based on response
    let note = '';
    if (res.statusCode >= 400) {
      try {
        const errorBody = typeof body === 'string' ? JSON.parse(body) : body;
        note = errorBody.error || `HTTP ${res.statusCode}`;
      } catch {
        note = `HTTP ${res.statusCode}`;
      }
    } else if (operationType === 'ratings.write') {
      note = 'Rating save attempt';
    } else if (operationType === 'circleScore.read') {
      note = 'Circle Score fetch';
    } else if (operationType === 'ratings.read') {
      note = 'User rating fetch';
    } else if (operationType === 'restaurant.read') {
      note = 'Restaurant details fetch';
    }

    // Write forensics trace
    const trace: ForensicsTrace = {
      t: 'trace',
      op: operationType,
      path: req.path,
      restaurantId: identifiers.restaurantId,
      placeId: identifiers.placeId,
      userId,
      cacheHit,
      status: res.statusCode,
      ms: duration,
      note,
      timestamp: new Date().toISOString()
    };

    writeTrace(trace).catch(err => {
      console.error('Forensics trace write failed:', err);
    });

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Get recent forensics traces for analysis
 */
export async function getForensicsTraces(limit: number = 100): Promise<ForensicsTrace[]> {
  try {
    const data = await fs.readFile(FORENSICS_LOG_PATH, 'utf-8');
    const lines = data.trim().split('\n').filter(line => line.trim());
    const traces = lines
      .slice(-limit) // Get last N traces
      .map(line => {
        try {
          return JSON.parse(line) as ForensicsTrace;
        } catch {
          return null;
        }
      })
      .filter(trace => trace !== null) as ForensicsTrace[];
    
    return traces;
  } catch (err) {
    console.error('Failed to read forensics traces:', err);
    return [];
  }
}