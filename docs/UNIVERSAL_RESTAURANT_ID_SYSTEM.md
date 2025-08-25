# Universal Restaurant ID System

## Problem
The platform was breaking due to inconsistent restaurant ID handling across components. Different restaurants use different identifiers (database IDs vs Google Place IDs), causing rating, Circle Score, and data sharing failures.

## Solution
Universal identifier system that works for ANY restaurant from ANY source.

## Key Principle
**ONE restaurant = ONE canonical identifier across ALL systems**

## Implementation

### Core Functions (server/lib/restaurantIdUtils.ts)

1. **getCanonicalRestaurantId(restaurant)** - Extract universal ID from any restaurant object
2. **parseRestaurantParam(param)** - Parse URL parameters universally
3. **getRatingEndpoint(restaurant)** - Generate correct API endpoints
4. **extractApiData(restaurant)** - Extract data for API calls

### Frontend Components

1. **useRestaurantRatingState(restaurant)** - Universal rating state hook
2. **QuickRateModal** - Universal rating creation/update
3. **RestaurantActionBar** - Consistent restaurant actions

### Backend APIs

1. **ratings.ts** - Handles both database and Google Place ID queries
2. **restaurants.ts** - Universal restaurant data retrieval
3. **circle-score.ts** - Consistent scoring across ID types

## Scale Benefits

✅ Works with search results (Google Places)
✅ Works with saved restaurants (database)
✅ Works with mixed ID types in user data
✅ Consistent member/data sharing access flows
✅ Proper Circle Score calculations across ALL restaurants
✅ Future-proof for any restaurant source

## Testing Verified

- Ratings work for both Pai Northern Thai Kitchen and Badiali
- Circle Score calculations handle mixed ID types
- Search results properly integrate with rating system
- Data sharing flows work consistently