import { Request, Response, NextFunction } from 'express';

interface PerformanceMetric {
  timestamp: number;
  method: string;
  url: string;
  duration?: number;
  statusCode?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  userAgent?: string;
  userId?: string;
}

const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000; // Keep last 1000 requests

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const endMemory = process.memoryUsage();
    
    // Only log slow requests (>1000ms) or errors
    if (duration > 1000 || res.statusCode >= 400) {
      console.log(`PERFORMANCE: ${req.method} ${req.url} - ${duration}ms - Status: ${res.statusCode} - Memory: ${(endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024}MB`);
    }
    
    const metric: PerformanceMetric = {
      timestamp: startTime,
      method: req.method,
      url: req.url,
      duration,
      statusCode: res.statusCode,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
      },
      userAgent: req.get('User-Agent'),
      userId: req.user?.id?.toString()
    };
    
    // Add to metrics array
    performanceMetrics.push(metric);
    
    // Keep only last MAX_METRICS entries
    if (performanceMetrics.length > MAX_METRICS) {
      performanceMetrics.splice(0, performanceMetrics.length - MAX_METRICS);
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Get performance metrics
export const getPerformanceMetrics = (): PerformanceMetric[] => {
  return [...performanceMetrics];
};

// Get slow requests
export const getSlowRequests = (thresholdMs: number = 1000): PerformanceMetric[] => {
  return performanceMetrics.filter(metric => 
    metric.duration && metric.duration > thresholdMs
  );
};

// Get memory-intensive requests
export const getMemoryIntensiveRequests = (thresholdMB: number = 10): PerformanceMetric[] => {
  return performanceMetrics.filter(metric => 
    metric.memoryUsage && 
    metric.memoryUsage.heapUsed / 1024 / 1024 > thresholdMB
  );
};

// Clear metrics (for cleanup)
export const clearMetrics = (): void => {
  performanceMetrics.length = 0;
};