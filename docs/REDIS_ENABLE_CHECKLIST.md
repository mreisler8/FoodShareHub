# Redis Enable Checklist

## Environment Variables Required

Set the following environment variables in your production/staging environment:

```bash
REDIS_URL=redis://localhost:6379
SEARCH_CACHE_TTL_S=60
PLACES_CACHE_TTL_S=300
ENABLE_PLACES=true
```

For cloud Redis services (e.g., Redis Cloud, AWS ElastiCache), update the REDIS_URL accordingly:

```bash
# Example for Redis Cloud
REDIS_URL=redis://username:password@host:port

# Example for AWS ElastiCache
REDIS_URL=redis://your-cluster-endpoint.cache.amazonaws.com:6379
```

## Verification Commands

### 1. Check Redis Connection
Look for these log messages on server startup:
```
✅ Success: Redis connection successful
❌ Error: Redis connection failed: connect ECONNREFUSED 127.0.0.1:6379. Caching disabled.
```

### 2. Verify Cache Population
After enabling Redis, perform some searches and look for cache-related logs:
```bash
# Look for cache hit/miss logs
tail -f logs/application.log | grep "Cache:"

# Example successful cache logs:
# SEARCH: /restaurants | 45ms | Cache: HIT | Places: cached | Results: 12
# SEARCH: /unified | 89ms | Cache: MISS | Places: timeout | Results: 8
```

### 3. Performance Validation
Expected cache hit rates after warm-up period:
- Restaurant searches: ≥ 60% cache hit rate
- User searches: ≥ 40% cache hit rate  
- Popular queries (pizza, sushi): ≥ 80% cache hit rate

### 4. Test Cache Keys
Connect to Redis CLI to verify keys are being set:
```bash
redis-cli
> KEYS search:*
> TTL search:restaurants:pizza:*
> GET search:restaurants:pizza:default
```

## Cache Configuration

Current cache TTL settings:
- Search results: 60 seconds (SEARCH_CACHE_TTL_S)
- Google Places results: 300 seconds (PLACES_CACHE_TTL_S)
- User search results: 30 seconds (default)

## Troubleshooting

### Redis Connection Issues
1. Verify Redis server is running: `redis-cli ping`
2. Check firewall rules for Redis port (6379)
3. Verify credentials for authenticated Redis instances
4. Test connection: `redis-cli -u $REDIS_URL ping`

### Performance Not Improving
1. Verify cache hit rate > 50% for repeated queries
2. Check if Places API is timing out (should not impact search speed)
3. Monitor search timing logs for cache effectiveness
4. Ensure warm-up period completed (30-60 seconds of search activity)

## Production Deployment Steps

1. Set environment variables in deployment platform
2. Restart application services
3. Monitor logs for Redis connection success
4. Run authenticated load tests to verify performance targets
5. Set up monitoring alerts for cache hit rates < 50%