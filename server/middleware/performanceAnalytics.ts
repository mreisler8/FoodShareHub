import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: number;
  userAgent?: string;
  timestamp: Date;
  memoryUsage?: number;
  dbQueryTime?: number;
}

// In-memory performance data collection
const performanceData: PerformanceMetric[] = [];
const MAX_METRICS = 1000; // Keep last 1000 metrics in memory

export function performanceAnalyticsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  const originalJson = res.json;
  
  const captureMetrics = () => {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - startMemory;
    
    // Collect performance metric
    const metric: PerformanceMetric = {
      endpoint: req.path,
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      userId: req.user?.id,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      memoryUsage: memoryDelta
    };
    
    // Add to in-memory collection
    performanceData.push(metric);
    
    // Keep only recent metrics
    if (performanceData.length > MAX_METRICS) {
      performanceData.shift();
    }
    
    // Log slow requests (>500ms)
    if (responseTime > 500) {
      console.log(`⚠️  SLOW REQUEST: ${req.method} ${req.path} - ${responseTime}ms - Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
  };
  
  // Override res.end
  res.end = function(...args: any[]) {
    captureMetrics();
    return originalEnd.apply(this, args);
  };
  
  // Override res.json  
  res.json = function(obj: any) {
    captureMetrics();
    return originalJson.call(this, obj);
  };
  
  next();
}

// Get performance analytics data
export function getPerformanceAnalytics() {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  const recentMetrics = performanceData.filter(m => 
    m.timestamp.getTime() > oneHourAgo
  );
  
  // Calculate analytics
  const totalRequests = recentMetrics.length;
  const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests || 0;
  const slowRequests = recentMetrics.filter(m => m.responseTime > 500).length;
  const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
  
  // Endpoint performance breakdown
  const endpointStats = recentMetrics.reduce((acc, metric) => {
    const key = `${metric.method} ${metric.endpoint}`;
    if (!acc[key]) {
      acc[key] = { count: 0, totalTime: 0, errors: 0 };
    }
    acc[key].count++;
    acc[key].totalTime += metric.responseTime;
    if (metric.statusCode >= 400) acc[key].errors++;
    return acc;
  }, {} as Record<string, { count: number; totalTime: number; errors: number }>);
  
  // Sort by average response time
  const topSlowEndpoints = Object.entries(endpointStats)
    .map(([endpoint, stats]) => ({
      endpoint,
      avgTime: stats.totalTime / stats.count,
      count: stats.count,
      errorRate: (stats.errors / stats.count) * 100
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 10);
  
  return {
    summary: {
      totalRequests,
      avgResponseTime: Math.round(avgResponseTime),
      slowRequestRate: (slowRequests / totalRequests) * 100 || 0,
      errorRate: (errorRequests / totalRequests) * 100 || 0
    },
    topSlowEndpoints,
    recentMetrics: recentMetrics.slice(-20) // Last 20 requests
  };
}

// User engagement analytics
export async function getUserEngagementAnalytics(userId: number) {
  try {
    const analytics = await db.execute(sql`
      WITH user_activity AS (
        SELECT 
          'list_creation' as activity_type,
          COUNT(*) as count,
          MAX(created_at) as last_activity
        FROM restaurant_lists 
        WHERE created_by_id = ${userId}
        
        UNION ALL
        
        SELECT 
          'restaurant_rating' as activity_type,
          COUNT(*) as count,
          MAX(created_at) as last_activity
        FROM ratings 
        WHERE user_id = ${userId}
        
        UNION ALL
        
        SELECT 
          'list_save' as activity_type,
          COUNT(*) as count,
          MAX(saved_at) as last_activity
        FROM saved_lists 
        WHERE user_id = ${userId}
      )
      SELECT 
        activity_type,
        count,
        last_activity
      FROM user_activity
      ORDER BY count DESC
    `);
    
    return analytics;
  } catch (error) {
    console.error('Error fetching user engagement analytics:', error);
    return [];
  }
}