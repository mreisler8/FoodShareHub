// Feed caching optimization for performance
interface CachedFeedData {
  data: any;
  timestamp: number;
  userId: number;
}

const feedCache = new Map<string, CachedFeedData>();
const CACHE_TTL = 120000; // 2 minutes
const MAX_CACHE_SIZE = 200;

export function getCachedFeedData(cacheKey: string): any | null {
  const cached = feedCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  // Clean up expired entry
  if (cached) {
    feedCache.delete(cacheKey);
  }
  
  return null;
}

export function setCachedFeedData(cacheKey: string, data: any, userId: number): void {
  feedCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    userId
  });
  
  // Clean up old entries if cache is getting too large
  if (feedCache.size > MAX_CACHE_SIZE) {
    const cutoff = Date.now() - CACHE_TTL;
    Array.from(feedCache.entries()).forEach(([key, value]) => {
      if (value.timestamp < cutoff) {
        feedCache.delete(key);
      }
    });
  }
}

export function invalidateUserFeedCache(userId: number): void {
  // Invalidate all cache entries for a specific user
  Array.from(feedCache.entries()).forEach(([key, value]) => {
    if (value.userId === userId || key.includes(`${userId}:`)) {
      feedCache.delete(key);
    }
  });
}