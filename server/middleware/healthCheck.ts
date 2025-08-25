import { Request, Response, Router } from 'express';
import { db } from '../db';
import { getPerformanceMetrics, getSlowRequests } from './performance';

const router = Router();

// Basic health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    await db.execute('SELECT 1');
    const dbResponseTime = Date.now() - startTime;
    
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`
      },
      memory: {
        used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Performance metrics endpoint
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = getPerformanceMetrics();
  const slowRequests = getSlowRequests(1000); // Requests over 1 second
  
  const summary = {
    totalRequests: metrics.length,
    slowRequests: slowRequests.length,
    averageResponseTime: metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length 
      : 0,
    slowestRequests: slowRequests
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10)
      .map(r => ({
        url: r.url,
        method: r.method,
        duration: r.duration,
        statusCode: r.statusCode
      }))
  };
  
  res.json(summary);
});

// Database health check
router.get('/health/database', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Test with actual query
    const result = await db.execute('SELECT COUNT(*) as count FROM users');
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      userCount: result.rows[0]
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as healthCheckRouter };