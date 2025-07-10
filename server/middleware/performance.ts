
import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  queryCount?: number;
  memoryUsage?: number;
  userAgent?: string;
  ipAddress?: string;
}

// Store metrics in memory (in production, use Redis or database)
const metricsCache = new Map<string, PerformanceMetrics>();

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  // Add request ID to request for tracking
  (req as any).requestId = requestId;
  
  // Store initial metrics with more detailed information
  metricsCache.set(requestId, {
    requestId,
    method: req.method,
    url: req.url,
    startTime,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip || req.connection.remoteAddress,
    memoryUsage: startMemory,
  });
  
  // Override res.json to capture response time and memory usage
  const originalJson = res.json;
  res.json = function(body) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - startMemory;
    
    // Update metrics
    const metrics = metricsCache.get(requestId);
    if (metrics) {
      metrics.endTime = endTime;
      metrics.duration = duration;
      metrics.statusCode = res.statusCode;
      metrics.memoryUsage = memoryDelta;
      
      // Log slow requests (> 1 second) with detailed info
      if (duration > 1000) {
        console.warn(`🐌 Slow request detected:`, {
          requestId,
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
          memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
        });
      }
      
      // Log memory-intensive requests (> 10MB)
      if (memoryDelta > 10 * 1024 * 1024) {
        console.warn(`🧠 Memory-intensive request:`, {
          requestId,
          method: req.method,
          url: req.url,
          memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          duration: `${duration}ms`
        });
      }
      
      // Clean up old metrics (keep last 1000 requests) with memory consideration
      if (metricsCache.size > 1000) {
        const oldestKey = metricsCache.keys().next().value;
        metricsCache.delete(oldestKey);
      }
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

export const getPerformanceMetrics = (): PerformanceMetrics[] => {
  return Array.from(metricsCache.values());
};

export const getSlowRequests = (thresholdMs: number = 1000): PerformanceMetrics[] => {
  return Array.from(metricsCache.values()).filter(
    metric => metric.duration && metric.duration > thresholdMs
  );
};
