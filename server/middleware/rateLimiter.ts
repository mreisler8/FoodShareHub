import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Rate limiter for ratings (max 5 ratings per 15 minutes per user/IP)
export const ratingsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Max 5 ratings per window (disabled via skip function if needed)
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise fall back to IP with IPv6 support
    if (req.user?.id) {
      return `rating_limit_user_${req.user.id}`;
    }
    return ipKeyGenerator(req);
  },
  skip: (req: Request) => {
    // Feature flag check - skip rate limiting if disabled or during development
    return process.env.FEATURE_RATING_LIMITS !== 'true' || process.env.NODE_ENV === 'development';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "You've reached your rating limit. Please try again later.",
      type: 'rate_limit',
      retryAfter: 900 // 15 minutes in seconds
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generic request rate limiter for API endpoints
export const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // Max 100 requests per minute
  keyGenerator: ipKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
});