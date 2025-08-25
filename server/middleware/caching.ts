import { Request, Response, NextFunction } from 'express';

// In-memory cache with TTL (in production, use Redis)
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

// Cache middleware with TTL
export const createCacheMiddleware = (ttlSeconds: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `${req.method}:${req.url}:${req.user?.id || 'anonymous'}`;
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < cached.ttl * 1000)) {
      console.log(`Cache hit: ${cacheKey}`);
      return res.json(cached.data);
    }
    
    // Override res.json to cache response
    const originalJson = res.json;
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: ttlSeconds
        });
        
        console.log(`Cache set: ${cacheKey} (TTL: ${ttlSeconds}s)`);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Cache invalidation helper
export const invalidateCache = (pattern: string) => {
  const keysToDelete: string[] = [];
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  console.log(`Cache invalidated: ${keysToDelete.length} entries for pattern "${pattern}"`);
};

// Cache cleanup (remove expired entries)
export const cleanupCache = () => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl * 1000) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
};

// Run cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// Specific cache helpers
export const userDataCache = createCacheMiddleware(300); // 5 minutes
export const circleDataCache = createCacheMiddleware(180); // 3 minutes
export const searchCache = createCacheMiddleware(60); // 1 minute
export const ratingCache = createCacheMiddleware(120); // 2 minutes