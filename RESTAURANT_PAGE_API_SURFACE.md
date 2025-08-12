# Restaurant Page API Surface Documentation

## API Route Overview

The restaurant page ecosystem exposes a comprehensive set of REST endpoints for restaurant data, ratings, scoring, and integration services.

## Core Restaurant Endpoints

### GET /api/restaurants
**Purpose**: Fetch restaurant details by Google Place ID
**Authentication**: Required (session-based)
**Location**: `server/routes/restaurants.ts`

**Query Parameters**:
```typescript
{
  googlePlaceId: string; // Required - Google Places identifier
}
```

**Response Format**:
```typescript
{
  id: string; // Format: "google_{googlePlaceId}"
  name: string;
  location: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: Record<string, string>;
  category: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  photos?: Array<{
    photoReference: string;
    width: number;
    height: number;
  }>;
  googlePlaces?: {
    // Raw Google Places data
  };
}
```

**Error Responses**:
- `400`: Missing Google Place ID
- `404`: Restaurant not found
- `500`: Google Places API error

**Data Sources**:
- Primary: Google Places API via `getPlaceDetails()`
- Fallback: Local restaurant database
- Image serving: Protected photo proxy

### GET /api/restaurants/photo/:photoReference
**Purpose**: Serve Google Places photos with API key protection
**Authentication**: None (public proxy)
**Location**: `server/routes/restaurants.ts`

**Path Parameters**:
```typescript
{
  photoReference: string; // Google Places photo reference
}
```

**Query Parameters**:
```typescript
{
  maxwidth?: string; // Default: "800"
}
```

**Response**: HTTP redirect to Google Places photo URL

**Implementation**:
```typescript
const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoReference}&key=${apiKey}`;
res.redirect(photoUrl);
```

## Rating System Endpoints

### GET /api/ratings/restaurant/:restaurantId
**Purpose**: Fetch user's personal rating for a restaurant
**Authentication**: Required
**Location**: `server/routes/ratings.ts`

**Path Parameters**:
```typescript
{
  restaurantId: number; // Internal restaurant ID
}
```

**Response Format**:
```typescript
{
  id: number;
  userId: number;
  restaurantId: number;
  ratingValue: string; // Decimal format "8.5"
  note?: string;
  tags?: string[];
  circleIds?: number[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
} | null // null if no rating exists
```

**Query Key**: `['userRating', restaurantId]`
**Cache Strategy**: 30-second stale time

### PUT /api/ratings
**Purpose**: Create or update user's restaurant rating
**Authentication**: Required
**Location**: `server/routes/ratings.ts`

**Request Body**:
```typescript
{
  restaurantId?: number;
  googlePlaceId?: string;
  restaurantName?: string;
  ratingValue: number; // 0.1-10.0
  note?: string;
  tags?: string[];
  circleIds?: number[];
  isPrivate?: boolean;
}
```

**Validation Rules**:
- Either `restaurantId` or `googlePlaceId` required
- `ratingValue` must be between 0.1 and 10.0
- Rate limiting: 5 ratings per 15 minutes
- Duplicate prevention: 24-hour cooldown

**Response**: Updated rating object

**Side Effects**:
- Invalidates `['userRating', restaurantId]` cache
- Invalidates `['circleScore', restaurantId]` cache
- Updates restaurant aggregate scores

## Circle Score Endpoints

### GET /api/restaurant/:restaurantId/circle-score
**Purpose**: Calculate trust-based restaurant score from user's network
**Authentication**: Required
**Location**: `server/routes/circle-score.ts`

**Path Parameters**:
```typescript
{
  restaurantId: number; // Internal restaurant ID
}
```

**Response Format**:
```typescript
{
  score: number; // 0-10 scale, rounded to 1 decimal
  ratingsCount: number;
  updatedAt: string;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}
```

**Algorithm Details**:
1. Resolve restaurant identity via `resolveRestaurantId()`
2. Get user's circle memberships
3. Find network members (circles + followers)
4. Query ratings from network for this restaurant
5. Calculate weighted average
6. Apply confidence scoring based on sample size

**Caching Strategy**:
- Redis cache with 3-minute TTL
- Cache key: `circleScore:${resolvedRestaurantId}`
- Background refresh on cache miss

**Query Key**: `['circleScore', restaurantId]`
**Stale Time**: 180 seconds (3 minutes)

## Search Integration Endpoints

### GET /api/search/restaurants
**Purpose**: Search restaurants with location and query filters
**Authentication**: Required
**Location**: `server/routes/search.ts`

**Query Parameters**:
```typescript
{
  q?: string; // Search query
  lat?: number; // Latitude
  lng?: number; // Longitude
  radius?: number; // Search radius in meters
  type?: string; // Place type filter
  limit?: number; // Default: 20, Max: 50
}
```

**Response Format**:
```typescript
{
  results: Array<{
    id: string;
    name: string;
    location: string;
    cuisine: string;
    rating: number;
    priceRange: string;
    distance?: number;
    googlePlaceId: string;
    imageUrl?: string;
  }>;
  totalCount: number;
  hasMore: boolean;
}
```

## Debug and Forensics Endpoints

### GET /api/_debug/restaurant-snapshot
**Purpose**: Read-only debugging data for restaurant analysis
**Authentication**: Required (development only)
**Location**: `server/routes/debug.ts`

**Query Parameters**:
```typescript
{
  restaurantId?: number;
  googlePlaceId?: string;
}
```

**Response Format**:
```typescript
{
  restaurant: {
    // Restaurant database record
  };
  ratings: Array<{
    // All ratings for this restaurant
  }>;
  identity: {
    resolvedId: number;
    source: 'database' | 'google_places';
  };
  cache: {
    circleScore?: any;
    ratings?: any;
  };
  metadata: {
    timestamp: string;
    queryType: string;
  };
}
```

## Authentication Middleware

All protected endpoints use session-based authentication:

```typescript
// Authentication check
if (!req.user?.id) {
  return res.status(401).json({ error: 'Authentication required' });
}
```

**Session Details**:
- Cookie name: `connect.sid`
- Store: PostgreSQL via `connect-pg-simple`
- Timeout: Configurable (default 24 hours)
- CSRF protection: Enabled

## Error Handling Patterns

### Standard Error Response Format
```typescript
{
  error: string; // Human-readable error message
  code?: string; // Machine-readable error code
  details?: any; // Additional error context
}
```

### Common Error Codes
- `MISSING_GOOGLE_PLACE_ID`: Required parameter missing
- `RESTAURANT_NOT_FOUND`: Invalid restaurant identifier
- `RATE_LIMIT_EXCEEDED`: Too many rating submissions
- `DUPLICATE_RATING`: Recent rating exists
- `AUTHENTICATION_REQUIRED`: User not logged in
- `INVALID_INPUT`: Request validation failed

### HTTP Status Code Usage
- `200`: Success with data
- `201`: Created (new ratings)
- `400`: Client error (validation, missing params)
- `401`: Authentication required
- `403`: Forbidden (rate limits, permissions)
- `404`: Resource not found
- `409`: Conflict (duplicate ratings)
- `429`: Rate limit exceeded
- `500`: Server error
- `502`: External service error (Google Places)

## Rate Limiting

### Rating Submissions
- **Limit**: 5 ratings per 15 minutes per user
- **Implementation**: In-memory tracking with Redis
- **Response**: HTTP 429 with retry-after header

### Search Requests
- **Limit**: 100 requests per minute per user
- **Implementation**: Express rate limiter
- **Exemptions**: Authenticated repeat searches

## Caching Strategy

### Redis Cache Implementation
```typescript
// Cache structure
const cacheKey = `circleScore:${restaurantId}`;
await setCache(cacheKey, result, 180); // 3-minute TTL
```

**Cache Keys**:
- `circleScore:{restaurantId}` - Circle score calculations
- `search:{hash}` - Search result caching
- `restaurant:{googlePlaceId}` - Restaurant details

### Cache Invalidation
- Manual: On rating updates
- Automatic: TTL expiration
- Selective: By cache key patterns

## External Service Integration

### Google Places API
**Base URL**: `https://maps.googleapis.com/maps/api/place/`
**Authentication**: API key in query parameter
**Rate Limiting**: 1000 requests per day (configurable)

**Used Endpoints**:
- `details/json` - Restaurant details
- `photo` - Restaurant photos
- `nearbysearch/json` - Location-based search

**Circuit Breaker Pattern**:
```typescript
try {
  const response = await fetch(googlePlacesUrl);
  if (!response.ok) {
    // Fallback to cached data or error response
  }
} catch (error) {
  // Circuit breaker logic
}
```

## Performance Monitoring

### Response Time Targets
- Restaurant details: < 300ms
- Circle score: < 500ms
- User ratings: < 200ms
- Search results: < 400ms

### Monitoring Points
- Database query timing
- External API response time
- Cache hit/miss rates
- Error rate tracking

## API Versioning Strategy

**Current Version**: v1 (implicit)
**Future Versioning**: Header-based (`API-Version: v2`)
**Backward Compatibility**: Maintained for 1 major version

## Security Considerations

### Input Validation
- Zod schema validation on all endpoints
- SQL injection prevention via Drizzle ORM
- XSS protection via input sanitization

### Data Privacy
- User ratings respect privacy settings
- Circle score calculations honor user preferences
- Personal data masking in debug endpoints

### API Key Protection
- Google Places API key server-side only
- Photo proxy prevents key exposure
- Environment variable configuration

This API surface documentation provides comprehensive coverage of all restaurant page related endpoints, their contracts, security considerations, and performance characteristics.