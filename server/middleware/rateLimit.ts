import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Enhanced rate limiting with different tiers
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message || 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const requestId = (req as any).requestId || 'unknown';
      console.warn(`Rate limit exceeded [${requestId}]:`, {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userId: req.user?.id
      });

      res.status(429).json({
        error: message || 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  });
};

// Different rate limits for different endpoints - RELAXED FOR DEVELOPMENT
export const generalRateLimit = createRateLimit(15 * 60 * 1000, 1000); // 1000 requests per 15 minutes (development)
export const authRateLimit = createRateLimit(15 * 60 * 1000, 50); // 50 login attempts per 15 minutes
export const searchRateLimit = createRateLimit(60 * 1000, 300); // 300 searches per minute (development)
export const followRateLimit = createRateLimit(60 * 60 * 1000, 500); // 500 follows per hour
export const recommendationRateLimit = createRateLimit(60 * 1000, 100); // 100 recommendations per minute