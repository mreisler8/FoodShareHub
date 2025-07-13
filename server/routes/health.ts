
<line_number>1</line_number>
import { Router } from 'express';
import { db } from '../db.js';
import { getPerformanceMetrics, getSlowRequests } from '../middleware/performance.js';

const router = Router();

/**
 * Health check endpoint
 * Returns system status and basic metrics
 */
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    await db.execute('SELECT 1');
    const dbResponseTime = Date.now() - startTime;
    
    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Get performance metrics
    const recentMetrics = getPerformanceMetrics().slice(-100); // Last 100 requests
    const slowRequests = getSlowRequests(1000); // Requests over 1 second
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      database: {
        connected: true,
        responseTime: `${dbResponseTime}ms`
      },
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      performance: {
        totalRequests: recentMetrics.length,
        slowRequests: slowRequests.length,
        averageResponseTime: recentMetrics.length > 0 
          ? `${Math.round(recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / recentMetrics.length)}ms`
          : '0ms'
      }
    };
    
    res.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Detailed performance metrics endpoint
 * Returns detailed system performance data
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = getPerformanceMetrics();
    const slowRequests = getSlowRequests(1000);
    
    res.json({
      totalRequests: metrics.length,
      slowRequests: slowRequests.length,
      recentRequests: metrics.slice(-50), // Last 50 requests
      slowRequestDetails: slowRequests.slice(-20), // Last 20 slow requests
      systemMemory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Metrics endpoint failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
