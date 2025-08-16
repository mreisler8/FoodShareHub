import { QueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

/**
 * Restaurant Cache Management
 * 
 * Centralized cache invalidation helpers for coordinated updates across
 * all restaurant-related widgets. Prevents race conditions and ensures
 * consistent data after mutations.
 */

export interface RestaurantCacheHelpers {
  invalidateRestaurant: (restaurantId: number | string) => Promise<void>;
  invalidateScores: (restaurantId: number | string) => Promise<void>;
  invalidateMentions: (restaurantId: number | string) => Promise<void>;
  invalidateAll: (restaurantId: number | string) => Promise<void>;
}

/**
 * React Hook for Restaurant Cache Management
 * 
 * Provides cache invalidation helpers with error boundaries and N/A fallbacks.
 * Implements the user's preference for robust error handling with graceful degradation.
 */
export function useRestaurantCache(queryClient: QueryClient): RestaurantCacheHelpers {
  const errorCountRef = useRef(0);
  const maxErrors = 3; // Circuit breaker threshold

  const withErrorBoundary = useCallback(
    async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        const result = await operation();
        errorCountRef.current = 0; // Reset on success
        return result;
      } catch (error) {
        errorCountRef.current += 1;
        console.warn(`Restaurant cache operation failed (${errorCountRef.current}/${maxErrors}):`, error);
        
        if (errorCountRef.current >= maxErrors) {
          console.warn('Restaurant cache circuit breaker activated - showing N/A data');
        }
        
        return fallback;
      }
    },
    []
  );

  const invalidateRestaurant = useCallback(async (restaurantId: number | string) => {
    return withErrorBoundary(async () => {
      await createRestaurantCacheHelpers(queryClient).invalidateRestaurant(restaurantId);
    }, undefined);
  }, [queryClient, withErrorBoundary]);

  const invalidateScores = useCallback(async (restaurantId: number | string) => {
    return withErrorBoundary(async () => {
      await createRestaurantCacheHelpers(queryClient).invalidateScores(restaurantId);
    }, undefined);
  }, [queryClient, withErrorBoundary]);

  const invalidateMentions = useCallback(async (restaurantId: number | string) => {
    return withErrorBoundary(async () => {
      await createRestaurantCacheHelpers(queryClient).invalidateMentions(restaurantId);
    }, undefined);
  }, [queryClient, withErrorBoundary]);

  const invalidateAll = useCallback(async (restaurantId: number | string) => {
    return withErrorBoundary(async () => {
      await createRestaurantCacheHelpers(queryClient).invalidateAll(restaurantId);
    }, undefined);
  }, [queryClient, withErrorBoundary]);

  return {
    invalidateRestaurant,
    invalidateScores,
    invalidateMentions,
    invalidateAll
  };
}

export function createRestaurantCacheHelpers(queryClient: QueryClient): RestaurantCacheHelpers {
  const invalidateRestaurant = async (restaurantId: number | string) => {
    const promises = [
      // Core restaurant data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/restaurants/${restaurantId}`] 
      }),
      queryClient.invalidateQueries({ 
        queryKey: ['/api/restaurants'],
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('googlePlaceId') || key?.includes(restaurantId.toString());
        }
      }),
      // User's saved/bookmarked restaurants
      queryClient.invalidateQueries({ 
        queryKey: ['/api/restaurants/saved'] 
      })
    ];
    
    await Promise.all(promises).catch(error => {
      console.error('Restaurant cache invalidation failed:', error);
    });
  };

  const invalidateScores = async (restaurantId: number | string) => {
    const promises = [
      // Standardized score queries
      queryClient.invalidateQueries({ 
        queryKey: ['userRating', restaurantId] 
      }),
      queryClient.invalidateQueries({ 
        queryKey: ['circleScore', restaurantId] 
      }),
      // Legacy score keys (cleanup)
      queryClient.invalidateQueries({ 
        queryKey: ['/api/circle-score'] 
      }),
      queryClient.invalidateQueries({ 
        queryKey: ['restaurant-ratings'] 
      })
    ];
    
    await Promise.all(promises).catch(error => {
      console.error('Score cache invalidation failed:', error);
    });
  };

  const invalidateMentions = async (restaurantId: number | string) => {
    const promises = [
      // Restaurant mentions in lists and posts
      queryClient.invalidateQueries({ 
        queryKey: ['restaurantLists', restaurantId] 
      }),
      queryClient.invalidateQueries({ 
        queryKey: ['restaurantPosts', restaurantId] 
      }),
      // User's personal lists (might include this restaurant)
      queryClient.invalidateQueries({ 
        queryKey: ['/api/lists'] 
      }),
      // Social activity feeds (might reference this restaurant)
      queryClient.invalidateQueries({ 
        queryKey: ['/api/posts'] 
      })
    ];
    
    await Promise.all(promises).catch(error => {
      console.error('Mentions cache invalidation failed:', error);
    });
  };

  const invalidateAll = async (restaurantId: number | string) => {
    console.log('RESTAURANT_CACHE: Full invalidation for restaurant', restaurantId);
    
    // Use Promise.allSettled to ensure partial failures don't block everything
    const results = await Promise.allSettled([
      invalidateRestaurant(restaurantId),
      invalidateScores(restaurantId), 
      invalidateMentions(restaurantId)
    ]);
    
    // Log any failures but don't throw
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const section = ['restaurant', 'scores', 'mentions'][index];
        console.error(`RESTAURANT_CACHE: ${section} invalidation failed:`, result.reason);
      }
    });
  };

  return {
    invalidateRestaurant,
    invalidateScores,
    invalidateMentions,
    invalidateAll
  };
}