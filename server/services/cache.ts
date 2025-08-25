import { features } from '../config/features';

// Simple in-memory cache with TTL as fallback
interface CacheItem {
  value: any;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheItem>();

export async function getCache(key: string): Promise<any> {
  if (features.REDIS_ENABLED) {
    // TODO: Implement Redis when available
    // const redis = getRedisClient();
    // return await redis.get(key);
  }
  
  // Fallback to memory cache
  const item = memoryCache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  
  return item.value;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
  if (features.REDIS_ENABLED) {
    // TODO: Implement Redis when available
    // const redis = getRedisClient();
    // await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return;
  }
  
  // Fallback to memory cache
  const expiresAt = Date.now() + (ttlSeconds * 1000);
  memoryCache.set(key, { value, expiresAt });
}

export async function delCache(key: string): Promise<void> {
  if (features.REDIS_ENABLED) {
    // TODO: Implement Redis when available
    // const redis = getRedisClient();
    // await redis.del(key);
    return;
  }
  
  // Fallback to memory cache
  memoryCache.delete(key);
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of Array.from(memoryCache.entries())) {
    if (now > item.expiresAt) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Clean up every minute