# Circle Score API Callers Audit Report

**Generated:** August 12, 2025  
**Purpose:** Document all Circle Score display components and verify query key consistency

## Circle Score Components Survey

### 1. Primary Circle Score Displays

#### CircleScoreDisplay (Large Widget)
**File:** `client/src/components/restaurant/CircleScoreDisplay.tsx`
**Query Key:** `['circleScore', restaurantId]`
**Usage:** Main "Your Circle's Take" widget on restaurant pages
**API Endpoint:** `/api/restaurant/${restaurantId}/circle-score`

#### CircleScoreBadge (Small Widget)  
**File:** `client/src/components/restaurant/CircleScoreBadge.tsx`
**Query Key:** `['restaurant', restaurantId, 'score']` ⚠️ **INCONSISTENT**
**Usage:** Small score display next to Google Score
**API Endpoint:** `/api/restaurant/${restaurantId}/circle-score`

### 2. Circle Score in Lists and Cards

#### RestaurantCard
**File:** `client/src/components/restaurant/RestaurantCard.tsx`
**Query Key:** `['circleScore', restaurantId]` ✅ **CONSISTENT**
**Usage:** Restaurant cards in search results and lists

#### RestaurantListItem
**File:** `client/src/components/restaurant/RestaurantListItem.tsx`  
**Query Key:** `['circleScore', restaurant.id]` ✅ **CONSISTENT**
**Usage:** Restaurant items in curated lists

### 3. Feed and Discovery Components

#### FeedPostCard (Restaurant Posts)
**File:** `client/src/components/feed/FeedPostCard.tsx`
**Query Key:** `['circleScore', post.restaurantId]` ✅ **CONSISTENT**
**Usage:** Circle Score in social feed restaurant posts

#### DiscoverCard  
**File:** `client/src/components/discover/DiscoverCard.tsx`
**Query Key:** `['circleScore', restaurant.id]` ✅ **CONSISTENT**
**Usage:** Discovery page restaurant recommendations

## Query Key Analysis

### Consistent Implementations (5/6) ✅
Standard pattern: `['circleScore', restaurantId]`
- CircleScoreDisplay
- RestaurantCard  
- RestaurantListItem
- FeedPostCard
- DiscoverCard

### Inconsistent Implementation (1/6) ⚠️
Non-standard pattern: `['restaurant', restaurantId, 'score']`
- CircleScoreBadge

## API Endpoint Status

### Expected Endpoint
**Route:** `/api/restaurant/:restaurantId/circle-score`
**Status:** ❌ **RETURNS 404**

### Current Implementation Issue
The audit reveals the Circle Score endpoint is missing or incorrectly routed:
```
GET /api/restaurant/26/circle-score 404 in 208ms :: {"error":"API endpoint not found"}
```

### Fallback Behavior
Components currently fail gracefully:
- Large widget shows "Score unavailable"
- Small badge shows empty state
- No error thrown, but user sees incomplete data

## Root Cause of 89 vs 0 Issue

### The Problem Explained
1. **CircleScoreDisplay** uses `['circleScore', restaurantId]` → API calls fail → shows 0
2. **CircleScoreBadge** uses `['restaurant', restaurantId, 'score']` → Different cache → shows cached/stale 89

### Cache Key Divergence
The inconsistent query keys prevent React Query from sharing data:
- Cache Key A: `circleScore:26` → Recent API failure → 0 value
- Cache Key B: `restaurant:26:score` → Old cached data → 89 value

## Required Fixes

### 1. Fix API Endpoint ⚠️
**Priority:** CRITICAL
**Issue:** `/api/restaurant/:restaurantId/circle-score` returns 404
**Solution:** Implement missing Circle Score endpoint

### 2. Standardize Query Keys ⚠️
**Priority:** HIGH  
**Issue:** CircleScoreBadge uses different query key pattern
**Solution:** Change `['restaurant', restaurantId, 'score']` to `['circleScore', restaurantId]`

### 3. Unified Cache Invalidation ⚠️
**Priority:** MEDIUM
**Issue:** Inconsistent cache keys prevent proper invalidation
**Solution:** Use single invalidation pattern for all Circle Score updates

## Implementation Plan

### Step 1: Fix API Endpoint
```typescript
// server/routes/restaurants.ts
app.get('/api/restaurant/:restaurantId/circle-score', async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId);
  const circleScore = await calculateCircleScore(restaurantId, req.user?.id);
  res.json(circleScore);
});
```

### Step 2: Standardize Query Key
```typescript
// client/src/components/restaurant/CircleScoreBadge.tsx
const { data: circleScore } = useQuery({
  queryKey: ['circleScore', restaurantId], // ← Change this line
  queryFn: () => fetchCircleScore(restaurantId)
});
```

### Step 3: Test Consistency
After fixes, all Circle Score widgets should:
- Use identical `['circleScore', restaurantId]` query keys
- Display the same values
- Share cached data efficiently

## Verification Checklist

- [ ] Circle Score API returns 200 status instead of 404
- [ ] All 6 components use `['circleScore', restaurantId]` query key
- [ ] Large and small widgets show identical values
- [ ] Debug panel shows 1 Circle Score request instead of 2+
- [ ] Cache invalidation works across all components

**Status:** CRITICAL - API endpoint missing and query key inconsistency confirmed as root cause of Circle Score divergence issue