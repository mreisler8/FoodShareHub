import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  memoryUsage: number;
  timestamp: number;
  statusCode: number;
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {
    // Cleanup old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, this.CLEANUP_INTERVAL);
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private cleanupOldMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const oldLength = this.metrics.length;
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
    
    if (this.metrics.length !== oldLength) {
      console.log(`Performance cleanup: removed ${oldLength - this.metrics.length} old metrics`);
    }
  }

  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  getSlowEndpoints(threshold: number = 500): PerformanceMetrics[] {
    return this.metrics
      .filter(metric => metric.responseTime > threshold)
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);
  }

  getAverageResponseTime(endpoint?: string): number {
    const filteredMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const total = filteredMetrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    return total / filteredMetrics.length;
  }

  getMemoryUsageStats(): { average: number; peak: number; current: number } {
    const memoryUsages = this.metrics.map(m => m.memoryUsage);
    const current = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    return {
      average: memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0,
      peak: Math.max(...memoryUsages, 0),
      current
    };
  }
}

const performanceOptimizer = PerformanceOptimizer.getInstance();

export function performanceMonitoring(req: Request, res: Response, next: NextFunction) {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const responseTime = Math.round(endTime - startTime);
    const memoryDelta = endMemory - startMemory;

    // Log performance metric
    const metric: PerformanceMetrics = {
      endpoint: req.path,
      method: req.method,
      responseTime,
      memoryUsage: memoryDelta,
      timestamp: Date.now(),
      statusCode: res.statusCode
    };

    performanceOptimizer.addMetric(metric);

    // Log slow requests
    if (responseTime > 300) {
      console.warn(`SLOW REQUEST: ${req.method} ${req.path} - ${responseTime}ms - Memory: ${memoryDelta.toFixed(2)}MB`);
    }

    // Log memory spikes
    if (Math.abs(memoryDelta) > 10) {
      console.warn(`MEMORY SPIKE: ${req.method} ${req.path} - ${memoryDelta.toFixed(2)}MB change`);
    }

    // Call original end
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}

export function performanceHealthCheck(req: Request, res: Response) {
  const slowEndpoints = performanceOptimizer.getSlowEndpoints();
  const averageResponseTime = performanceOptimizer.getAverageResponseTime();
  const memoryStats = performanceOptimizer.getMemoryUsageStats();

  const health = {
    performance: {
      averageResponseTime: Math.round(averageResponseTime),
      status: averageResponseTime < 300 ? 'healthy' : averageResponseTime < 500 ? 'warning' : 'critical'
    },
    memory: {
      ...memoryStats,
      status: memoryStats.current < 100 ? 'healthy' : memoryStats.current < 200 ? 'warning' : 'critical'
    },
    slowEndpoints: slowEndpoints.slice(0, 5),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };

  res.json(health);
}

// Auto-optimization middleware
export function autoOptimizer(req: Request, res: Response, next: NextFunction) {
  const endpoint = req.path;
  const recentAverage = performanceOptimizer.getAverageResponseTime(endpoint);

  // Skip optimization for fast endpoints
  if (recentAverage < 200) {
    return next();
  }

  // Apply optimizations for slow endpoints
  
  // 1. Aggressive caching headers for slow endpoints
  if (req.method === 'GET' && recentAverage > 500) {
    res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
  }

  // 2. Connection keep-alive optimization
  res.set('Connection', 'keep-alive');
  res.set('Keep-Alive', 'timeout=5, max=1000');

  // 3. Compression hint
  if (!res.get('Content-Encoding')) {
    res.set('Vary', 'Accept-Encoding');
  }

  next();
}

export { performanceOptimizer };