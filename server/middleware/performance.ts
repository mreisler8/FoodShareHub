
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
}

// Store metrics in memory (in production, use Redis or database)
const metricsCache = new Map<string, PerformanceMetrics>();

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // Add request ID to request for tracking
  (req as any).requestId = requestId;
  
  // Store initial metrics
  metricsCache.set(requestId, {
    requestId,
    method: req.method,
    url: req.url,
    startTime,
  });
  
  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function(body) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Update metrics
    const metrics = metricsCache.get(requestId);
    if (metrics) {
      metrics.endTime = endTime;
      metrics.duration = duration;
      metrics.statusCode = res.statusCode;
      
      // Log slow requests (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow request detected:`, {
          requestId,
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          statusCode: res.statusCode
        });
      }
      
      // Clean up old metrics (keep last 1000 requests)
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
