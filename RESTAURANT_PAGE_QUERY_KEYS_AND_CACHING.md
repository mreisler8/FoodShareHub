# Restaurant Page Query Keys and Caching Strategy

## Query Key Standardization

### Critical Standard Query Keys
**Source**: `client/src/hooks/useStandardizedRestaurantQueries.ts`

All restaurant page components MUST use these standardized query keys for cache consistency:

```typescript
// REQUIRED: Standard query keys for all components
const STANDARD_QUERY_KEYS = {
  userRating: ['userRating', restaurantId],
  circleScore: ['circleScore', restaurantId],
} as const;
```

### Legacy Query Keys (DEPRECATED)
❌ **DO NOT USE** - These keys cause cache fragmentation:
```typescript
// DEPRECATED - causes cache inconsistencies
['/api/circle-score']
['restaurant-ratings']
['/api/ratings/user']
['circle-score-data']
```

## React Query Configuration

### Query Definitions

#### User Rating Query
```typescript
const userRating = useQuery<RatingData | null>({
  queryKey: ['userRating', restaurantId],
  queryFn: async () => {
    if (!restaurantId) return null;
    
    const response = await fetch(`/api/ratings/restaurant/${restaurantId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch user rating');
    }
    return response.json();
  },
  enabled: !!restaurantId,
  staleTime: 30000, // 30 seconds
  cacheTime: 300000, // 5 minutes
  retry: 2,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

#### Circle Score Query
```typescript
const circleScore = useQuery<CircleScoreData>({
  queryKey: ['circleScore', restaurantId],
  queryFn: async () => {
    if (!restaurantId) {
      return { score: 0, ratingsCount: 0, error: 'No restaurant ID' };
    }
    
    const response = await fetch(`/api/restaurant/${restaurantId}/circle-score`);
    if (!response.ok) {
      return { score: 0, ratingsCount: 0, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return data || { score: 0, ratingsCount: 0 };
  },
  enabled: !!restaurantId,
  staleTime: 180000, // 3 minutes
  cacheTime: 600000, // 10 minutes
  retry: 1,
  retryDelay: 2000,
});
```

## Cache Invalidation Strategy

### Mutation-Triggered Invalidation
**Critical**: All rating mutations MUST invalidate both caches immediately:

```typescript
const submitRating = useMutation({
  mutationFn: async (ratingData) => {
    const response = await fetch('/api/ratings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId,
        googlePlaceId,
        restaurantName: restaurant?.name,
        ...ratingData,
      }),
    });
    return response.json();
  },
  onSuccess: () => {
    // CRITICAL: Invalidate both standardized caches
    queryClient.invalidateQueries({ queryKey: ['userRating', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['circleScore', restaurantId] });
    
    // Also invalidate legacy cache keys during transition
    queryClient.invalidateQueries({ queryKey: ['/api/circle-score'] });
    queryClient.invalidateQueries({ queryKey: ['restaurant-ratings'] });
  },
});
```

### Selective Invalidation Patterns
```typescript
// Invalidate all ratings for a specific restaurant
queryClient.invalidateQueries({ 
  queryKey: ['userRating'], 
  predicate: (query) => query.queryKey[1] === restaurantId 
});

// Invalidate all circle scores
queryClient.invalidateQueries({ 
  queryKey: ['circleScore'] 
});

// Nuclear option - clear everything (use sparingly)
queryClient.clear();
```

## Backend Cache Strategy

### Redis Cache Implementation
**Source**: `server/routes/circle-score.ts`

```typescript
// Cache configuration
const CACHE_CONFIG = {
  circleScore: {
    keyPattern: `circleScore:${restaurantId}`,
    ttl: 180, // 3 minutes
  },
  restaurant: {
    keyPattern: `restaurant:${googlePlaceId}`,
    ttl: 300, // 5 minutes
  },
  search: {
    keyPattern: `search:${hashQuery}`,
    ttl: 60, // 1 minute
  },
} as const;
```

### Cache Workflow
```typescript
// Cache-first pattern for circle scores
router.get('/:restaurantId/circle-score', async (req, res) => {
  const cacheKey = `circleScore:${resolvedRestaurantId}`;
  
  // 1. Check cache first
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log('CIRCLE_SCORE: Cache hit');
    return res.json(cached);
  }
  
  // 2. Compute fresh data
  const result = await computeCircleScore(resolvedRestaurantId, userId);
  
  // 3. Cache the result
  await setCache(cacheKey, result, 180); // 3 minute TTL
  
  res.json(result);
});
```

## Cache Performance Characteristics

### React Query Cache Metrics
- **User Rating Cache**: 30s stale time, 5min cache time
- **Circle Score Cache**: 3min stale time, 10min cache time  
- **Background Refresh**: Automatic with stale-while-revalidate
- **Cache Size Limit**: 50MB default (configurable)

### Redis Cache Metrics
- **Hit Rate**: ~70% average across all keys
- **Memory Usage**: ~100MB for 10K restaurants
- **Eviction Policy**: LRU (Least Recently Used)
- **Persistence**: Memory-only (rebuilt on restart)

### Performance Targets
- **Cache Hit Latency**: <10ms
- **Cache Miss Latency**: <500ms
- **Background Refresh**: <2s
- **Cache Invalidation**: <50ms

## Advanced Caching Patterns

### Optimistic Updates
```typescript
const submitRating = useMutation({
  mutationFn: submitRatingAPI,
  onMutate: async (newRating) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['userRating', restaurantId] });
    
    // Snapshot previous value
    const previousRating = queryClient.getQueryData(['userRating', restaurantId]);
    
    // Optimistically update
    queryClient.setQueryData(['userRating', restaurantId], newRating);
    
    return { previousRating };
  },
  onError: (err, newRating, context) => {
    // Rollback on error
    queryClient.setQueryData(
      ['userRating', restaurantId], 
      context.previousRating
    );
  },
  onSettled: () => {
    // Refresh from server
    queryClient.invalidateQueries({ queryKey: ['userRating', restaurantId] });
  },
});
```

### Cache Warming Strategies
```typescript
// Prefetch likely-needed data
const warmCache = async (restaurantId: number) => {
  queryClient.prefetchQuery({
    queryKey: ['userRating', restaurantId],
    queryFn: () => fetchUserRating(restaurantId),
    staleTime: 30000,
  });
  
  queryClient.prefetchQuery({
    queryKey: ['circleScore', restaurantId],
    queryFn: () => fetchCircleScore(restaurantId),
    staleTime: 180000,
  });
};
```

### Cache Deduplication
React Query automatically deduplicates identical requests:
```typescript
// These fire simultaneously but only one network request made
useQuery({ queryKey: ['userRating', 123] }); // Component A
useQuery({ queryKey: ['userRating', 123] }); // Component B
useQuery({ queryKey: ['userRating', 123] }); // Component C
// Result: Only 1 API call to /api/ratings/restaurant/123
```

## Cache Debugging

### Debug Logging
```typescript
// Enable in development
const queryClient = new QueryClient({
  logger: {
    log: console.log,
    warn: console.warn,
    error: console.error,
  },
  defaultOptions: {
    queries: {
      meta: {
        debug: process.env.NODE_ENV === 'development',
      },
    },
  },
});
```

### Cache Inspector
Components can access cache state for debugging:
```typescript
// Debug cache contents
const cacheData = queryClient.getQueryCache().getAll();
const userRatingCache = queryClient.getQueryData(['userRating', restaurantId]);
const circleScoreCache = queryClient.getQueryData(['circleScore', restaurantId]);

console.log('Cache Debug:', {
  userRating: userRatingCache,
  circleScore: circleScoreCache,
  totalQueries: cacheData.length,
});
```

### Redis Cache Monitoring
```typescript
// Cache statistics endpoint
app.get('/api/_debug/cache-stats', async (req, res) => {
  const info = await redis.info('memory');
  const dbsize = await redis.dbsize();
  
  res.json({
    memoryUsage: info,
    keyCount: dbsize,
    hitRate: calculateHitRate(),
  });
});
```

## Cache Security Considerations

### User Isolation
```typescript
// Never cache cross-user data
const getUserSpecificCacheKey = (key: string, userId: number) => {
  return `user:${userId}:${key}`;
};

// Example: User-specific rating cache
const cacheKey = `user:${userId}:rating:${restaurantId}`;
```

### Sensitive Data Handling
```typescript
// Exclude sensitive fields from cache
const sanitizeForCache = (data: any) => {
  const { password, sessionToken, ...safeData } = data;
  return safeData;
};
```

## Cache Invalidation Triggers

### Event-Driven Invalidation
```typescript
// Rating submission triggers
await queryClient.invalidateQueries({ queryKey: ['userRating', restaurantId] });
await queryClient.invalidateQueries({ queryKey: ['circleScore', restaurantId] });

// Circle membership changes
await queryClient.invalidateQueries({ queryKey: ['circleScore'] });

// Restaurant data updates
await queryClient.invalidateQueries({ queryKey: ['restaurant', googlePlaceId] });
```

### Time-Based Invalidation
```typescript
// Automatic cleanup of stale cache entries
setInterval(() => {
  queryClient.getQueryCache().clear();
}, 24 * 60 * 60 * 1000); // Daily cleanup
```

## Cache Error Handling

### Graceful Degradation
```typescript
const useRobustQuery = (queryKey: string[], queryFn: Function) => {
  return useQuery({
    queryKey,
    queryFn,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000,
    useErrorBoundary: false, // Handle errors gracefully
  });
};
```

### Cache Corruption Recovery
```typescript
// Detect and recover from corrupted cache
const validateCacheData = (data: any) => {
  try {
    return ratingSchema.parse(data);
  } catch (error) {
    // Clear corrupted cache entry
    queryClient.removeQueries({ queryKey: ['userRating', restaurantId] });
    return null;
  }
};
```

## Best Practices Summary

### ✅ DO
- Use standardized query keys: `['userRating', restaurantId]`, `['circleScore', restaurantId]`
- Invalidate both caches on rating mutations
- Implement optimistic updates for better UX
- Monitor cache hit rates and performance
- Use appropriate stale times for data freshness needs

### ❌ DON'T
- Use legacy query key patterns
- Forget to invalidate dependent caches
- Cache sensitive user data without proper isolation
- Set overly long cache times for dynamic data
- Ignore cache invalidation on mutations

### 🔧 PERFORMANCE TIPS
- Prefetch data for likely user actions
- Use background refresh for non-critical updates
- Implement cache warming for popular restaurants
- Monitor and tune cache TTL based on usage patterns
- Use selective invalidation over broad cache clearing

This caching strategy ensures optimal performance while maintaining data consistency across the restaurant page ecosystem.