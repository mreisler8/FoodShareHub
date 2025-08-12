# Restaurant Page Wire Map

**Generated:** August 12, 2025  
**Purpose:** Map all widgets to their data sources for debugging data flow issues

## Widget → Endpoint → Query Key Mapping

```
Restaurant Detail Page
├── Circle Score Tile
│   ├── Endpoint: /api/restaurant/:restaurantId/circle-score
│   ├── Query Key: ['circleScore', restaurantId]
│   ├── Identity: Uses resolved restaurantId
│   └── Cache: 3 minutes TTL
│
├── Your Rating Block  
│   ├── Endpoint: /api/ratings/restaurant/:restaurantId
│   ├── Query Key: ['userRating', restaurantId]
│   ├── Identity: Uses resolved restaurantId
│   └── Cache: 30 seconds TTL
│
├── Rating Save Action
│   ├── Endpoint: PUT /api/ratings
│   ├── Mutation: submitRating.mutate()
│   ├── Identity: Sends both restaurantId + googlePlaceId
│   └── Invalidates: ['userRating', restaurantId], ['circleScore', restaurantId]
│
├── Featured Lists
│   ├── Endpoint: /api/restaurant-lists (real data)
│   ├── Query Key: Various
│   └── Identity: Uses restaurantId
│
└── Restaurant Details
    ├── Endpoint: /api/restaurants/:restaurantId
    ├── Query Key: ['/api/restaurants', restaurantId] 
    └── Identity: Primary lookup by restaurantId
```

## Identity Resolution Flow

```
Input (restaurantId OR googlePlaceId)
         ↓
resolveRestaurantId() service
         ↓
Canonical { restaurantId, placeId }
         ↓
All widgets use resolved restaurantId
```

## Data Flow Standardization

### Before (Problematic)
- Multiple endpoints for Circle Score
- Inconsistent query keys
- Mixed restaurantId/placeId usage
- No identity resolution

### After (Fixed)
- Single Circle Score endpoint: `/api/restaurant/:restaurantId/circle-score`
- Standardized query keys: `['circleScore', restaurantId]`, `['userRating', restaurantId]`
- All widgets use resolved restaurantId
- Identity resolution prevents cross-contamination

## Critical Endpoints

| Widget | Endpoint | Method | Identity Used |
|--------|----------|--------|---------------|
| Circle Score Tile | `/api/restaurant/:restaurantId/circle-score` | GET | restaurantId |
| Your Rating | `/api/ratings/restaurant/:restaurantId` | GET | restaurantId |
| Save Rating | `/api/ratings` | PUT | restaurantId + placeId |
| Restaurant Info | `/api/restaurants/:restaurantId` | GET | restaurantId |

## Debug Tools

- **Debug Panel:** Available with `?debug=1` 
- **Debug Endpoint:** `/api/_debug/restaurant-snapshot`
- **Forensics Tracing:** All requests logged to `/logs/restaurant-forensics.jsonl`
- **Probe Script:** `scripts/forensics/probe-badiali.ts`