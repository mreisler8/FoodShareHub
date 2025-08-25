# Performance Optimization Environment Variables

This document describes the environment variables used for search performance optimization.

## Redis Configuration

```bash
# Redis connection URL for caching
REDIS_URL=redis://localhost:6379
```

## Search Cache Settings

```bash
# TTL for search results cache (in seconds)
SEARCH_CACHE_TTL_S=60

# TTL for Google Places API results cache (in seconds) 
PLACES_CACHE_TTL_S=300
```

## Google Places API Configuration

```bash
# Enable/disable Google Places API integration
ENABLE_PLACES=true

# Timeout for Google Places API calls (in milliseconds)
PLACES_TIMEOUT_MS=200

# Circuit breaker: number of consecutive failures before opening circuit
PLACES_CIRCUIT_FAILURES=5

# Circuit breaker: cooldown period in seconds before retrying
PLACES_CIRCUIT_COOLDOWN_S=60
```

## Default Values

If environment variables are not set, the following defaults will be used:

- `REDIS_URL`: `redis://localhost:6379`
- `SEARCH_CACHE_TTL_S`: `60` 
- `PLACES_CACHE_TTL_S`: `300`
- `PLACES_TIMEOUT_MS`: `200`
- `PLACES_CIRCUIT_FAILURES`: `5`
- `PLACES_CIRCUIT_COOLDOWN_S`: `60`
- `ENABLE_PLACES`: `true`

## Performance Targets

With these optimizations, the expected performance should be:

- **Restaurant Search**: P95 ≤ 250ms (down from 1200ms)
- **Unified Search**: P95 ≤ 280ms (down from 1500ms)  
- **User Search**: P95 ≤ 180ms (down from 350ms)
- **Cache Hit Rate**: ≥ 60% for repeated queries
- **Error Rate**: ≤ 1%

## Redis Setup (Development)

For local development without Redis server:

1. The system will run with caching disabled (graceful degradation)
2. All functionality will work, but without performance benefits
3. To enable Redis, install and start a local Redis server:

```bash
# On macOS with Homebrew
brew install redis
brew services start redis

# On Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

## Monitoring

Search performance metrics are logged in structured JSON format:

```json
{
  "t": "search",
  "path": "/api/search/restaurants", 
  "ms": 120,
  "cacheHit": false,
  "places": "timeout",
  "query": "pizza",
  "results": 15,
  "userId": 123
}
```

- `t`: Type (always "search")
- `path`: API endpoint path
- `ms`: Total response time in milliseconds
- `cacheHit`: Whether cache was hit (true/false)
- `places`: Google Places API status (hit/miss/timeout/circuit/disabled)
- `query`: Search query string
- `results`: Number of results returned
- `userId`: User ID (if authenticated)