# Phase 2 - Restaurant Page UI Consistency Inventory
**Status:** READ-ONLY INVENTORY - NO CODE CHANGES  
**Date:** August 12, 2025  
**Objective:** Complete catalog of all restaurant page UI widgets and their data sources to identify consistency issues

## Executive Summary

This inventory maps every UI widget on the restaurant detail page to understand data flows, query patterns, and potential sources of inconsistency. The systematic analysis will inform targeted fixes to ensure single source of truth for restaurant data display.

## Restaurant Page Components Mapping

### 1. Main Page Component: RestaurantDetailPage.tsx
**Location:** `client/src/pages/RestaurantDetailPage.tsx`
**Primary Role:** Orchestrates all restaurant page widgets and data fetching
**Key Data Sources:**
- Primary Restaurant Data: Direct API call to `/api/restaurants/${id}` or `/api/restaurants?googlePlaceId=${placeId}`
- Standardized Queries: Uses `useStandardizedRestaurantQueries` hook
- Query Keys: `['/api/restaurants/${restaurantId}']`, `['userRating', restaurantId]`, `['circleScore', restaurantId]`

**Data Flow Pattern:**
```javascript
// Primary restaurant fetch
queryKey: [queryMethod === 'googlePlaceId' ? `/api/restaurants?googlePlaceId=${restaurantId}` : `/api/restaurants/${restaurantId}`]

// Standardized rating/score queries  
const { userRating, circleScore } = useStandardizedRestaurantQueries(restaurant)
```

### 2. Circle Score Display Widgets

#### 2A. Dual Score Display (Rotten Tomatoes Style)
**Location:** RestaurantDetailPage.tsx (lines 494-537)
**Data Source:** 
- Google Score: `restaurant.googlePlaces?.rating` (converted to percentage)
- Circle Score: `circleScoreData?.score` from standardized hook
**Query Keys:** `['circleScore', restaurant?.id]`
**Debug Annotation:** Uses DebugOrigin with endpoint `/api/restaurant/:id/circle-score`

#### 2B. CircleScoreEnhancement Component
**Location:** `client/src/components/mvp/CircleScoreEnhancement`
**Data Source:** Props-based: `restaurantId`, `googlePlaceId`
**Integration:** Lines 540-544 in RestaurantDetailPage.tsx
**Query Pattern:** Likely uses its own internal queries (needs verification)

#### 2C. CircleScoreCard Component  
**Location:** `client/src/components/restaurant/CircleScoreCard.tsx`
**Props:** `{ circleScore, isLoading }`
**Data Source:** Receives data from parent component
**Display Logic:** 
- Shows score as `(displayScore / 10).toFixed(1)/10.0`
- Handles null states with "No Circle Score Available" message
- Modal breakdown showing individual contributor ratings

### 3. User Rating Widgets

#### 3A. YourRatingCard Component
**Location:** `client/src/components/restaurant/YourRatingCard.tsx`
**Data Source:** `userRatingData` from standardized hook
**Query Keys:** `['userRating', restaurant?.id]`
**Debug Annotation:** Lines 609-614 with DebugOrigin, endpoint `/api/ratings/restaurant/:id`
**Integration:** Lines 616-625 with rating submission via `submitRating.mutate()`

**Data Transform:**
```javascript
userRating={userRatingData ? {
  rating: parseFloat(userRatingData.ratingValue.toString()) || 0,
  note: userRatingData.note,
  tags: userRatingData.tags
} : undefined}
```

#### 3B. QuickRateButton Component
**Location:** Imported from `@/components/ratings/QuickRateButton`
**Integration:** Not directly visible in current RestaurantDetailPage, likely used in action bar
**Data Source:** Likely uses standardized rating submission

### 4. Supporting Display Components

#### 4A. RatingDisplay Component
**Location:** `client/src/components/ratings/RatingDisplay.tsx`
**Purpose:** General rating display with star visualization
**Scale:** 5-point rating system (`rating.ratingValue/5`)
**Features:** Compact mode, badges, timestamps

#### 4B. DecimalRatingSlider Component  
**Location:** `client/src/components/ratings/DecimalRatingSlider.tsx`
**Purpose:** 10-point decimal rating input (0.1-10.0)
**Features:** Star visualization, slider input, descriptive labels
**Scale Mapping:** 10 stars for 10-point scale with percentage fill

### 5. List Integration Components

#### 5A. ListMentionsCard Component
**Location:** `client/src/components/restaurant/ListMentionsCard.tsx`
**Data Source:** `mockLists` array in RestaurantDetailPage (lines 328-351)
**Purpose:** Shows lists containing this restaurant
**Features:** Ranking badges, privacy indicators, horizontal scroll
**Status:** Currently using mock data - needs real API integration

#### 5B. PostMentionsCard Component  
**Location:** `client/src/components/restaurant/PostMentionsCard.tsx`
**Data Source:** `restaurant.communityInsights?.recentPosts`
**Integration:** Uses `mockPosts` variable (line 353)

### 6. Action and Navigation Components

#### 6A. RestaurantActionBar Component
**Location:** `client/src/components/restaurant/RestaurantActionBar.tsx`
**Props:** Restaurant object with id/googlePlaceId, isSaved status
**Integration:** Lines 565-576
**Features:** Save, share, and other restaurant actions

#### 6B. Debug Components
**Location:** `client/src/components/debug/RestaurantDebugPanel.tsx`
**Purpose:** Development debugging with `?debug=1` parameter
**Data Sources:** Shows restaurant ID, Google Place ID mapping

## Data Source Analysis

### Query Key Patterns
1. **Legacy/Mixed Patterns:**
   - `/api/restaurants/${id}` - Direct restaurant fetch
   - `/api/restaurants?googlePlaceId=${placeId}` - Place ID based fetch

2. **Standardized Patterns:** ✅
   - `['userRating', restaurantId]` - User rating data
   - `['circleScore', restaurantId]` - Circle score data

3. **Endpoint Mapping:**
   - User Ratings: `/api/ratings/restaurant/${restaurantId}`
   - Circle Score: `/api/restaurant/${restaurantId}/circle-score` (unified endpoint)

### Identified Consistency Issues

#### Issue 1: Multiple Circle Score Data Sources
- **Dual Score Display** uses `circleScoreData` from standardized hook
- **CircleScoreEnhancement** may use its own internal queries
- **CircleScoreCard** receives data via props
- **Risk:** Different components may show different scores due to cache inconsistencies

#### Issue 2: Rating Scale Inconsistencies  
- **RatingDisplay:** 5-point scale display (`/5`)
- **DecimalRatingSlider:** 10-point input (0.1-10.0)
- **YourRatingCard:** 10-point rating with slider
- **CircleScoreCard:** 10-point display (`/10.0`)
- **Risk:** Scale conversion errors between input and display

#### Issue 3: Mock Data Usage
- **ListMentionsCard** uses `mockLists` 
- **PostMentionsCard** uses `mockPosts`
- **Risk:** UI shows fake data instead of real restaurant associations

#### Issue 4: Multiple Restaurant Identity Handlers
- Primary component handles both database ID and Google Place ID routing
- Different query methods: `'id'` vs `'googlePlaceId'`
- Components receive restaurant data via different prop structures
- **Risk:** Identity resolution inconsistencies across widgets

## Standardized Hook Analysis: useStandardizedRestaurantQueries

**Location:** `client/src/hooks/useStandardizedRestaurantQueries.ts`
**Purpose:** Unified data fetching for restaurant ratings and circle scores
**Query Keys:** 
- `['userRating', restaurantId]`
- `['circleScore', restaurantId]`
**Endpoints:**
- User Rating: `/api/ratings/restaurant/${restaurantId}`
- Circle Score: `/api/restaurant/${restaurantId}/circle-score`

**Cache Invalidation:**
```javascript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['userRating', restaurantId] });
  queryClient.invalidateQueries({ queryKey: ['circleScore', restaurantId] });
}
```

## Phase 2 Implementation Recommendations

### Priority 1: Circle Score Consistency
1. Audit `CircleScoreEnhancement` component query patterns
2. Ensure all circle score widgets use standardized hook data
3. Eliminate duplicate API calls for same data

### Priority 2: Rating Scale Standardization
1. Document official rating scale (10-point confirmed via Phase 1)
2. Audit all display components for consistent scale usage
3. Fix any 5-point legacy displays

### Priority 3: Mock Data Elimination
1. Implement real API endpoints for list mentions
2. Connect PostMentionsCard to actual post data
3. Remove all mock data references

### Priority 4: Component Data Flow Optimization
1. Centralize restaurant data through standardized hook
2. Eliminate redundant API calls
3. Ensure consistent prop passing patterns

## Next Steps: Phase 2 Part B Implementation

Based on this inventory, Phase 2 Part B will focus on:
1. **Circle Score Unification** - Single source of truth across all widgets
2. **Mock Data Replacement** - Real API integration for lists and posts  
3. **Rating Scale Consistency** - Standardized 10-point display
4. **Cache Optimization** - Eliminate redundant queries

**Success Criteria:** All restaurant page widgets display consistent, real data from unified sources with no cache inconsistencies or mock content.