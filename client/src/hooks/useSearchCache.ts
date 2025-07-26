import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface SearchCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
}

/**
 * Search result caching hook with 5-minute TTL and intelligent invalidation
 * Reduces search API calls and improves response times to under 500ms
 */
export function useSearchCache<T>({
  ttl = 5 * 60 * 1000, // 5 minutes default
  maxSize = 100
}: SearchCacheOptions = {}) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const requestsRef = useRef<Map<string, Promise<T>>>(new Map());

  const getCacheKey = useCallback((query: string, options?: Record<string, any>) => {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${query.toLowerCase().trim()}_${optionsStr}`;
  }, []);

  const isValidEntry = useCallback((entry: CacheEntry<T>) => {
    return Date.now() - entry.timestamp < entry.ttl;
  }, []);

  const cleanupExpired = useCallback(() => {
    const cache = cacheRef.current;
    const expiredKeys: string[] = [];
    
    cache.forEach((entry, key) => {
      if (!isValidEntry(entry)) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }, [isValidEntry]);

  const evictOldest = useCallback(() => {
    const cache = cacheRef.current;
    if (cache.size <= maxSize) return;
    
    // Remove oldest entries
    const entriesToRemove = cache.size - maxSize + 1;
    const keys = Array.from(cache.keys());
    
    for (let i = 0; i < entriesToRemove; i++) {
      cache.delete(keys[i]);
    }
    
    console.log(`Cache eviction: removed ${entriesToRemove} oldest entries`);
  }, [maxSize]);

  const get = useCallback((query: string, options?: Record<string, any>) => {
    if (!query.trim()) return null;
    
    const key = getCacheKey(query, options);
    const entry = cacheRef.current.get(key);
    
    if (entry && isValidEntry(entry)) {
      console.log(`Cache hit for query: ${query}`);
      return entry.data;
    }
    
    // Remove expired entry
    if (entry) {
      cacheRef.current.delete(key);
    }
    
    return null;
  }, [getCacheKey, isValidEntry]);

  const set = useCallback((query: string, data: T, options?: Record<string, any>) => {
    if (!query.trim()) return;
    
    const key = getCacheKey(query, options);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    cacheRef.current.set(key, entry);
    
    // Cleanup and eviction
    cleanupExpired();
    evictOldest();
    
    console.log(`Cache set for query: ${query} (cache size: ${cacheRef.current.size})`);
  }, [getCacheKey, ttl, cleanupExpired, evictOldest]);

  const invalidate = useCallback((pattern?: string) => {
    const cache = cacheRef.current;
    
    if (!pattern) {
      // Clear all cache
      cache.clear();
      console.log('Cache: cleared all entries');
      return;
    }
    
    // Pattern-based invalidation
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      if (key.includes(pattern.toLowerCase())) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => cache.delete(key));
    console.log(`Cache: invalidated ${keysToDelete.length} entries matching pattern: ${pattern}`);
  }, []);

  const getOrFetch = useCallback(async (
    query: string,
    fetchFn: () => Promise<T>,
    options?: Record<string, any>
  ): Promise<T> => {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }
    
    // Check cache first
    const cached = get(query, options);
    if (cached) {
      return cached;
    }
    
    // Check if request is already in flight
    const key = getCacheKey(query, options);
    const existingRequest = requestsRef.current.get(key);
    if (existingRequest) {
      console.log(`Request deduplication for query: ${query}`);
      return existingRequest;
    }
    
    // Make new request
    const startTime = Date.now();
    const request = fetchFn()
      .then(result => {
        const responseTime = Date.now() - startTime;
        console.log(`Search completed in ${responseTime}ms for query: ${query}`);
        
        // NFR: Log slow searches for optimization
        if (responseTime > 500) {
          console.warn(`Slow search detected: ${responseTime}ms for query: ${query}`);
        }
        
        // Cache successful result
        set(query, result, options);
        return result;
      })
      .finally(() => {
        // Remove from in-flight requests
        requestsRef.current.delete(key);
      });
    
    // Track in-flight request
    requestsRef.current.set(key, request);
    
    return request;
  }, [get, set, getCacheKey]);

  const getStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      inFlightRequests: requestsRef.current.size,
      maxSize
    };
  }, [maxSize]);

  return {
    get,
    set,
    invalidate,
    getOrFetch,
    getStats,
    cleanupExpired
  };
}