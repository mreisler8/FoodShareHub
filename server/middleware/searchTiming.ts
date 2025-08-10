import { Request, Response, NextFunction } from 'express';

/**
 * Enhanced search timing middleware for performance monitoring
 */
export interface SearchTimingData {
  t: 'search';
  path: string;
  ms: number;
  cacheHit: boolean;
  places: 'hit' | 'miss' | 'timeout' | 'circuit' | 'disabled' | null;
  dbMs?: number;
  placesMs?: number;
  query?: string;
  results?: number;
  userId?: number;
}

declare global {
  namespace Express {
    interface Request {
      searchTiming?: {
        startTime: number;
        cacheHit?: boolean;
        placesStatus?: 'hit' | 'miss' | 'timeout' | 'circuit' | 'disabled';
        dbTime?: number;
        placesTime?: number;
        resultCount?: number;
      };
    }
  }
}

/**
 * Search timing middleware factory
 */
export function createSearchTimingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only instrument search endpoints
    if (!req.path.startsWith('/api/search/')) {
      return next();
    }

    const startTime = performance.now();
    
    // Initialize timing data
    req.searchTiming = {
      startTime,
      cacheHit: false,
      placesStatus: null,
      dbTime: undefined,
      placesTime: undefined,
      resultCount: 0
    };

    // Capture original res.json to log on response
    const originalJson = res.json;
    res.json = function(data: any) {
      const endTime = performance.now();
      const totalMs = Math.round(endTime - startTime);

      // Extract result count if available
      let resultCount = 0;
      if (data) {
        if (Array.isArray(data.results)) {
          resultCount = data.results.length;
        } else if (Array.isArray(data)) {
          resultCount = data.length;
        } else if (data.restaurants && Array.isArray(data.restaurants)) {
          resultCount = data.restaurants.length;
        } else if (data.users && Array.isArray(data.users)) {
          resultCount = data.users.length;
        } else if (typeof data.total === 'number') {
          resultCount = data.total;
        }
      }

      // Log structured timing data
      const timingData: SearchTimingData = {
        t: 'search',
        path: req.path,
        ms: totalMs,
        cacheHit: req.searchTiming?.cacheHit || false,
        places: req.searchTiming?.placesStatus || null,
        query: req.query.q as string || undefined,
        results: resultCount,
        userId: (req as any).user?.id || undefined
      };

      // Add detailed timings if available
      if (req.searchTiming?.dbTime !== undefined) {
        timingData.dbMs = Math.round(req.searchTiming.dbTime);
      }
      if (req.searchTiming?.placesTime !== undefined) {
        timingData.placesMs = Math.round(req.searchTiming.placesTime);
      }

      // Log as structured JSON for monitoring
      console.log(JSON.stringify(timingData));

      // Log human-readable format for development
      if (process.env.NODE_ENV === 'development') {
        const cacheStatus = timingData.cacheHit ? 'HIT' : 'MISS';
        const placesStatus = timingData.places ? timingData.places.toUpperCase() : 'N/A';
        console.log(
          `SEARCH: ${req.path} | ${totalMs}ms | Cache: ${cacheStatus} | Places: ${placesStatus} | Results: ${resultCount}`
        );
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Helper functions for search routes to track timing details
 */
export class SearchTimingHelper {
  /**
   * Mark cache hit in request timing
   */
  static markCacheHit(req: Request): void {
    if (req.searchTiming) {
      req.searchTiming.cacheHit = true;
    }
  }

  /**
   * Mark cache miss in request timing
   */
  static markCacheMiss(req: Request): void {
    if (req.searchTiming) {
      req.searchTiming.cacheHit = false;
    }
  }

  /**
   * Record database operation timing
   */
  static recordDbTime(req: Request, startTime: number): void {
    if (req.searchTiming) {
      req.searchTiming.dbTime = performance.now() - startTime;
    }
  }

  /**
   * Record Places API operation timing and status
   */
  static recordPlacesTime(
    req: Request, 
    startTime: number, 
    status: 'hit' | 'miss' | 'timeout' | 'circuit' | 'disabled'
  ): void {
    if (req.searchTiming) {
      req.searchTiming.placesTime = performance.now() - startTime;
      req.searchTiming.placesStatus = status;
    }
  }

  /**
   * Set Places status without timing (for cache hits or early exits)
   */
  static setPlacesStatus(
    req: Request, 
    status: 'hit' | 'miss' | 'timeout' | 'circuit' | 'disabled'
  ): void {
    if (req.searchTiming) {
      req.searchTiming.placesStatus = status;
    }
  }

  /**
   * Record result count
   */
  static recordResultCount(req: Request, count: number): void {
    if (req.searchTiming) {
      req.searchTiming.resultCount = count;
    }
  }

  /**
   * Get current timing data (useful for debugging)
   */
  static getCurrentTiming(req: Request): any {
    if (!req.searchTiming) return null;

    const now = performance.now();
    return {
      elapsed: Math.round(now - req.searchTiming.startTime),
      cacheHit: req.searchTiming.cacheHit,
      placesStatus: req.searchTiming.placesStatus,
      dbTime: req.searchTiming.dbTime,
      placesTime: req.searchTiming.placesTime,
      resultCount: req.searchTiming.resultCount
    };
  }
}

export default createSearchTimingMiddleware;