# Restaurant Page Data Contracts

## Schema Definitions

### Restaurant Entity
**Source**: `shared/schema.ts` - Line 450-512
**Table**: `restaurants`

```typescript
interface Restaurant {
  id: number; // Primary key
  name: string;
  cuisine: string;
  location: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: Record<string, string>; // JSON field
  priceRange: string; // '$', '$$', '$$$', '$$$$'
  rating: number; // Aggregate rating 0-10
  reviewCount: number;
  googlePlaceId?: string; // External identifier
  imageUrl?: string;
  category?: string;
  isVerified: boolean;
  status: 'active' | 'inactive' | 'pending'; // Enum
  createdAt: Date;
  updatedAt: Date;
}
```

**Database Constraints**:
- `name`: NOT NULL, up to 255 characters
- `cuisine`: NOT NULL, defaults to 'Unknown'
- `location`: NOT NULL
- `priceRange`: NOT NULL, defaults to '$$'
- `rating`: DECIMAL(3,1), defaults to 0
- `googlePlaceId`: UNIQUE when present
- `status`: ENUM with default 'active'

**Indexes**:
- Primary: `id`
- Unique: `google_place_id` (when not null)
- Performance: `(status, created_at)`, `(location, cuisine)`

### Rating Entity
**Source**: `shared/schema.ts` - Line 773-790
**Table**: `ratings`

```typescript
interface Rating {
  id: number; // Primary key
  userId: number; // Foreign key to users.id
  restaurantId?: number; // Foreign key to restaurants.id
  googlePlaceId?: string; // For non-DB restaurants
  restaurantName?: string; // Cache for display
  ratingValue: number; // DECIMAL(3,1), range 0.1-10.0
  note?: string; // Optional 140-char note
  tags: string[]; // Array of quick tags
  sharedWithCircle: boolean; // Privacy control
  circleIds: number[]; // Array of circle IDs
  isPrivate: boolean; // Default true
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `ratingValue`: Must be between 0.1 and 10.0
- Either `restaurantId` OR `googlePlaceId` required
- `note`: Maximum 140 characters
- `tags`: Array of strings, max 10 tags
- `circleIds`: Array of valid circle IDs

**Business Logic**:
- Duplicate prevention: One rating per user per restaurant
- Rate limiting: 5 ratings per 15 minutes
- Cooldown: 24 hours between rating updates

### Circle Score Data Contract
**Source**: `client/src/hooks/useStandardizedRestaurantQueries.ts` - Line 22-27

```typescript
interface CircleScoreData {
  score: number; // 0-10 scale, 1 decimal precision
  ratingsCount: number; // Number of ratings considered
  confidence?: 'high' | 'medium' | 'low'; // Data quality indicator
  error?: string; // Error message if calculation failed
  updatedAt?: string; // ISO timestamp
}
```

**Calculation Algorithm**:
1. **Network Discovery**: Find user's circles and followers
2. **Rating Collection**: Query ratings from network members
3. **Score Calculation**: Weighted average of network ratings
4. **Confidence Assessment**: Based on sample size and recency

**Confidence Levels**:
- `high`: 5+ ratings from last 90 days
- `medium`: 2-4 ratings from last 180 days  
- `low`: 1 rating or older data

### Restaurant Identity Resolution
**Source**: `server/services/restaurantIdentity.ts`

```typescript
interface IdentityInput {
  restaurantId?: number; // Internal database ID
  placeId?: string; // Google Places ID
}

interface IdentityResolution {
  canonicalId: number; // Resolved internal ID
  source: 'database' | 'google_places' | 'created';
  restaurant: Restaurant; // Full restaurant object
}
```

**Resolution Logic**:
1. If `restaurantId` provided → validate existence → return ID
2. If `placeId` provided → lookup in database → return existing ID
3. If `placeId` not found → create new restaurant record → return new ID
4. If neither provided → throw validation error

## API Response Contracts

### GET /api/restaurants Response
```typescript
interface RestaurantResponse {
  id: string; // Format: "google_{googlePlaceId}"
  name: string;
  location: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: Record<string, string>;
  category: string;
  cuisine: string;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  rating: number; // Google Places rating
  reviewCount: number;
  imageUrl?: string; // Processed photo URL
  photos?: GooglePlacesPhoto[];
  googlePlaces?: {
    // Raw Google Places data
    place_id: string;
    formatted_address: string;
    international_phone_number?: string;
    website?: string;
    opening_hours?: {
      weekday_text: string[];
    };
    photos?: GooglePlacesPhoto[];
  };
}

interface GooglePlacesPhoto {
  photoReference: string;
  width: number;
  height: number;
}
```

### GET /api/ratings/restaurant/:restaurantId Response
```typescript
interface UserRatingResponse {
  id: number;
  userId: number;
  restaurantId: number;
  ratingValue: string; // String representation of decimal
  note?: string;
  tags?: string[];
  circleIds?: number[];
  isPrivate: boolean;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
} | null // null when no rating exists
```

### PUT /api/ratings Request
```typescript
interface RatingCreateRequest {
  restaurantId?: number; // Required if no googlePlaceId
  googlePlaceId?: string; // Required if no restaurantId
  restaurantName?: string; // Optional cache value
  ratingValue: number; // 0.1-10.0
  note?: string; // Max 140 characters
  tags?: string[]; // Max 10 tags
  circleIds?: number[]; // Valid circle IDs
  isPrivate?: boolean; // Default true
}
```

### GET /api/restaurant/:restaurantId/circle-score Response
```typescript
interface CircleScoreResponse {
  score: number; // 0-10, 1 decimal place
  ratingsCount: number;
  updatedAt: string; // ISO timestamp
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}
```

## Data Flow Contracts

### Frontend Hook Contract
**Source**: `useStandardizedRestaurantQueries.ts`

```typescript
interface UseStandardizedRestaurantQueriesResult {
  // Query objects
  userRating: UseQueryResult<RatingData | null>;
  circleScore: UseQueryResult<CircleScoreData>;
  
  // Data shortcuts
  data: {
    userRating: RatingData | null;
    circleScore: CircleScoreData;
  };
  
  // Loading states
  isLoading: boolean;
  
  // Error states
  hasError: any;
  
  // Actions
  submitRating: UseMutationResult<any, Error, RatingSubmissionData>;
  
  // Cache management
  invalidateAll: () => void;
}
```

### Query Key Standardization
**Critical**: All components must use standardized query keys for cache consistency

```typescript
// Standardized query keys
const USER_RATING_KEY = ['userRating', restaurantId];
const CIRCLE_SCORE_KEY = ['circleScore', restaurantId];

// Legacy keys (DO NOT USE)
// ['/api/circle-score'] - DEPRECATED
// ['restaurant-ratings'] - DEPRECATED
```

## Validation Schemas

### Rating Submission Validation
**Source**: `shared/schema.ts` - insertRatingSchema

```typescript
const insertRatingSchema = z.object({
  userId: z.number().int().positive(),
  restaurantId: z.number().int().positive().optional(),
  googlePlaceId: z.string().optional(),
  restaurantName: z.string().optional(),
  ratingValue: z.number().min(0.1).max(10.0),
  note: z.string().max(140).optional(),
  tags: z.array(z.string()).max(10).default([]),
  sharedWithCircle: z.boolean().default(false),
  circleIds: z.array(z.number().int()).default([]),
  isPrivate: z.boolean().default(true),
}).refine((data) => {
  // Either restaurantId OR googlePlaceId required
  return data.restaurantId || data.googlePlaceId;
}, {
  message: "Either restaurantId or googlePlaceId must be provided"
});
```

### Restaurant Query Validation
```typescript
const restaurantQuerySchema = z.object({
  googlePlaceId: z.string().min(1),
}).strict();
```

## Error Contract Standards

### Standard Error Response
```typescript
interface ErrorResponse {
  error: string; // Human-readable message
  code?: string; // Machine-readable code
  details?: any; // Additional context
  timestamp?: string; // ISO timestamp
}
```

### Error Codes
- `MISSING_GOOGLE_PLACE_ID`: Required parameter missing
- `RESTAURANT_NOT_FOUND`: Invalid restaurant ID
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `DUPLICATE_RATING`: Rating cooldown active
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_REQUIRED`: User not logged in
- `CIRCLE_SCORE_UNAVAILABLE`: Network calculation failed

## Cache Contract

### Redis Cache Keys
```typescript
// Cache key patterns
const CACHE_KEYS = {
  circleScore: `circleScore:${restaurantId}`,
  restaurant: `restaurant:${googlePlaceId}`,
  userRating: `userRating:${userId}:${restaurantId}`,
} as const;
```

### Cache TTL Standards
- Circle scores: 180 seconds (3 minutes)
- Restaurant details: 300 seconds (5 minutes)
- User ratings: 30 seconds
- Search results: 60 seconds

### React Query Cache Standards
```typescript
// Stale time configuration
const STALE_TIMES = {
  userRating: 30000, // 30 seconds
  circleScore: 180000, // 3 minutes
  restaurantDetails: 300000, // 5 minutes
} as const;
```

## Type Safety Enforcement

### Runtime Type Checking
All API responses are validated against TypeScript interfaces using Zod schemas:

```typescript
// Example runtime validation
const parseRestaurantResponse = (data: unknown): Restaurant => {
  return restaurantSchema.parse(data);
};
```

### Frontend Type Guards
```typescript
// Type guard for rating data
const isValidRating = (rating: any): rating is RatingData => {
  return rating && 
         typeof rating.ratingValue === 'string' &&
         !isNaN(parseFloat(rating.ratingValue)) &&
         parseFloat(rating.ratingValue) >= 0.1 &&
         parseFloat(rating.ratingValue) <= 10.0;
};
```

## Data Integrity Contracts

### Cross-Contamination Prevention
- Restaurant identity resolver ensures canonical ID mapping
- All ratings validated against correct restaurant identity
- Test data filtering via `is_test` field (when implemented)

### Audit Trail Requirements
- All rating changes logged with timestamps
- Restaurant identity resolution logged
- Cache operations tracked for debugging

### Privacy Contracts
- User ratings respect `isPrivate` flag
- Circle scores only include authorized network data
- Debug endpoints mask sensitive information

## Migration Contracts

### Backward Compatibility
- API responses include deprecated fields during transition periods
- Database schema changes use non-breaking additions
- Query key migration maintains cache consistency

### Future Schema Evolution
- New fields added as optional with defaults
- Deprecated fields marked clearly in documentation
- Migration scripts for data transformation

This data contract documentation ensures type safety, consistency, and maintainability across the entire restaurant page ecosystem.