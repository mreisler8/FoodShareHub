import { redis } from '../lib/redis';
import crypto from 'crypto';

// In-flight request deduplication
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Search Cache Service
 * Handles caching for search results with in-flight request deduplication
 */
export class SearchCache {
  private static readonly DEFAULT_TTL = parseInt(process.env.SEARCH_CACHE_TTL_S || '60', 10);
  private static readonly PLACES_TTL = parseInt(process.env.PLACES_CACHE_TTL_S || '300', 10);

  /**
   * Generate cache key for search operations
   */
  static generateCacheKey(type: string, query: string, filters: Record<string, any> = {}): string {
    const filterHash = this.hashObject(filters);
    const baseKey = `search:${type}:q=${encodeURIComponent(query)}`;
    
    if (Object.keys(filters).length === 0) {
      return baseKey;
    }
    
    return `${baseKey}:filters=${filterHash}`;
  }

  /**
   * Generate cache key for Google Places operations
   */
  static generatePlacesCacheKey(type: 'search' | 'details', query: string, lat?: number, lng?: number, placeId?: string): string {
    if (type === 'details' && placeId) {
      return `places:details:${placeId}`;
    }
    
    if (type === 'search') {
      const coords = (lat && lng) ? `:lat=${lat.toFixed(6)}:lng=${lng.toFixed(6)}` : '';
      return `places:q=${encodeURIComponent(query)}${coords}`;
    }
    
    throw new Error('Invalid places cache key parameters');
  }

  /**
   * Get cached value with in-flight request deduplication
   */
  static async getCached<T>(key: string): Promise<T | null> {
    try {
      // Check if request is already in flight
      if (pendingRequests.has(key)) {
        return await pendingRequests.get(key);
      }

      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed as T;
      }
      
      return null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  static async setCached(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const ttl = ttlSeconds || this.DEFAULT_TTL;
      const serialized = JSON.stringify(value);
      
      const success = await redis.set(key, serialized, ttl);
      
      // Remove from pending requests if it was there
      pendingRequests.delete(key);
      
      return success;
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Execute function with caching and in-flight request deduplication
   */
  static async cached<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Check cache first
    const cached = await this.getCached<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is in flight
    if (pendingRequests.has(key)) {
      return await pendingRequests.get(key);
    }

    // Execute and cache
    const promise = fetchFunction();
    pendingRequests.set(key, promise);

    try {
      const result = await promise;
      await this.setCached(key, result, ttlSeconds);
      return result;
    } catch (error) {
      pendingRequests.delete(key);
      throw error;
    }
  }

  /**
   * Cache search results for restaurants
   */
  static async cacheRestaurantSearch(
    query: string, 
    results: any[], 
    lat?: number, 
    lng?: number, 
    additionalFilters: Record<string, any> = {}
  ): Promise<boolean> {
    const filters = {
      ...additionalFilters,
      ...(lat && lng ? { lat: lat.toFixed(6), lng: lng.toFixed(6) } : {})
    };
    
    const key = this.generateCacheKey('restaurants', query, filters);
    return await this.setCached(key, results, this.DEFAULT_TTL);
  }

  /**
   * Get cached restaurant search results
   */
  static async getCachedRestaurantSearch(
    query: string, 
    lat?: number, 
    lng?: number, 
    additionalFilters: Record<string, any> = {}
  ): Promise<any[] | null> {
    const filters = {
      ...additionalFilters,
      ...(lat && lng ? { lat: lat.toFixed(6), lng: lng.toFixed(6) } : {})
    };
    
    const key = this.generateCacheKey('restaurants', query, filters);
    return await this.getCached<any[]>(key);
  }

  /**
   * Cache Places API results
   */
  static async cachePlacesSearch(query: string, results: any[], lat?: number, lng?: number): Promise<boolean> {
    const key = this.generatePlacesCacheKey('search', query, lat, lng);
    return await this.setCached(key, results, this.PLACES_TTL);
  }

  /**
   * Get cached Places API search results
   */
  static async getCachedPlacesSearch(query: string, lat?: number, lng?: number): Promise<any[] | null> {
    const key = this.generatePlacesCacheKey('search', query, lat, lng);
    return await this.getCached<any[]>(key);
  }

  /**
   * Cache Places API details
   */
  static async cachePlaceDetails(placeId: string, details: any): Promise<boolean> {
    const key = this.generatePlacesCacheKey('details', '', undefined, undefined, placeId);
    return await this.setCached(key, details, this.PLACES_TTL);
  }

  /**
   * Get cached Places API details
   */
  static async getCachedPlaceDetails(placeId: string): Promise<any | null> {
    const key = this.generatePlacesCacheKey('details', '', undefined, undefined, placeId);
    return await this.getCached<any>(key);
  }

  /**
   * Helper to hash object for consistent cache keys
   */
  private static hashObject(obj: Record<string, any>): string {
    const sorted = Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {} as Record<string, any>);

    return crypto
      .createHash('md5')
      .update(JSON.stringify(sorted))
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Clear cache entries matching a pattern
   */
  static async clearPattern(pattern: string): Promise<void> {
    // Note: This is a simple implementation. For production with Redis Cluster,
    // you'd need to implement SCAN-based pattern deletion
    console.log(`Cache pattern clear requested: ${pattern} (implementation depends on Redis setup)`);
  }

  /**
   * Get cache statistics (for monitoring)
   */
  static getCacheStats(): { enabled: boolean; pendingRequests: number } {
    return {
      enabled: redis.isEnabled,
      pendingRequests: pendingRequests.size
    };
  }
}

export default SearchCache;