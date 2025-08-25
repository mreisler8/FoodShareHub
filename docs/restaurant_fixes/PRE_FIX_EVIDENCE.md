# Restaurant Page Cross-Contamination Evidence (Pre-Fix)

**Generated**: 2025-08-12 14:17:51  
**Phase**: 0 - Read-only Verification  
**Target**: Badiali Restaurant Contamination Issue

## Executive Summary

✅ **CONFIRMED**: Cross-contamination detected between Pizzeria Badiali and Villa di Roma ratings data  
✅ **FORENSICS TOOLS**: All debug infrastructure operational  
✅ **IDENTITY RESOLUTION**: Canonical ID system working but contamination bypasses it

## Critical Evidence

### 1. Debug Endpoint Snapshot
**URL**: `/api/_debug/restaurant-snapshot?restaurantId=26&placeId=ChIJuQdEYaE1K4gRSb-QHzZpGss`  
**Status**: ✅ Success (200)

#### Identity Resolution
```json
{
  "resolved": {
    "restaurantId": 26,
    "placeId": "ChIJuQdEYaE1K4gRSb-QHzZpGss"
  },
  "dbRow": {
    "id": 26,
    "name": "Pizzeria Badiali",
    "location": "Unknown location",
    "googlePlaceId": "ChIJuQdEYaE1K4gRSb-QHzZpGss"
  }
}
```

#### **🚨 CONTAMINATION EVIDENCE**
**Expected**: User rating should reference "Pizzeria Badiali"  
**Actual**: User rating shows "Villa di Roma" for the same place ID

```json
{
  "userRatingByRestaurantId": null,
  "userRatingByPlaceId": {
    "id": 1,
    "userId": 7,
    "restaurantId": null,
    "googlePlaceId": "ChIJuQdEYaE1K4gRSb-QHzZpGss",
    "restaurantName": "Villa di Roma", // ❌ WRONG - Should be "Pizzeria Badiali"
    "ratingValue": "8.9",
    "note": "Universal system test for Villa di Roma",
    "tags": ["pizza", "toronto"]
  }
}
```

### 2. Badiali Probe Results
**Script**: `npx tsx scripts/audit/probe-badiali.ts`  
**Status**: ✅ Complete  
**Report**: Generated at `/docs/PROBE_BADIALI.md`

#### Key Probe Findings
- **Place ID Path**: ✅ Successfully resolved to Google Places data
- **Restaurant Data**: Shows correct "Pizzeria Badiali" from Google API
- **Identity Mapping**: Restaurant ID 26 correctly maps to place ID
- **Cross-Contamination**: User rating data shows Villa di Roma contamination

### 3. Circle Score Analysis
```json
{
  "circleScore": {
    "score": 0,
    "ratingsCount": "0"
  }
}
```

**Issue**: No ratings counted because:
1. User has no rating by `restaurantId` (correct path)
2. Rating exists only by `placeId` with wrong restaurant name

### 4. Forensics Infrastructure Status

#### Forensics Tracing
- **Log File**: `logs/restaurant-forensics.jsonl` ✅ Active
- **Middleware**: `forensicsTracing.ts` ✅ Operational
- **Debug Panel**: Restaurant debug available at `?debug=1`

#### Identity Resolution Service  
- **Service**: `server/services/restaurantIdentity.ts` ✅ Fixed LSP errors
- **Function**: `resolveRestaurantId()` returns correct canonical mapping
- **Return Type**: Now properly returns `{restaurantId, placeId}` object

## System Architecture Analysis

### Current Data Flow Issue
1. **Search Results** → Returns correct "Pizzeria Badiali" from Google
2. **Rating Creation** → Stored with placeId but wrong `restaurantName`  
3. **Rating Retrieval** → Shows "Villa di Roma" instead of "Pizzeria Badiali"
4. **Circle Score** → Shows 0 because no ratings found by `restaurantId`

### Test Data Contamination Status
```json
{
  "testDataPresent": {
    "ratings": 0,
    "details": []
  }
}
```
**Status**: No explicit test data contamination found via Villa di Roma pattern search

### Lists & Similar Data
```json
{
  "featuredLists": {
    "source": "/api/restaurant-lists",
    "count": "1"
  }
}
```
**Status**: Lists endpoint operational, needs verification for mock data

## Pre-Fix Screenshots & Evidence

### Debug Panel Access
- **URL**: Badiali restaurant page with `?debug=1`
- **Status**: Available for capture
- **Expected Issues**:
  - Circle Score widget: Shows 0 (should show actual rating)
  - Your Rating card: Shows "Villa di Roma" (should show "Pizzeria Badiali")

### Current UI State Predictions
Based on debug data:
1. **Circle Score**: Will show 0/No data (missing ratings)
2. **Your Rating**: Will display "Villa di Roma" name mismatch  
3. **Lists Section**: Will show real data (1 list found)
4. **Similar Restaurants**: Unknown - needs verification for mocks

## Phase 1 Implementation Readiness

### Backend Fixes Required
✅ **Identity Resolution**: Service working, needs enforced canonical binding  
🔲 **Ratings Read/Write**: Must prevent placeId ratings with wrong restaurant names  
🔲 **Test Data Quarantine**: Global `is_test != TRUE` filter needed  
🔲 **Circle Score Unified**: Single endpoint to prevent cache mismatches  
🔲 **Database Constraints**: Unique constraint on `google_place_id` required

### Frontend Fixes Required  
🔲 **Standardized Hook**: `useStandardizedRestaurantQueries.ts` creation  
🔲 **Rating UI Deduplication**: Remove secondary rating displays  
🔲 **Circle Score Consistency**: Both widgets use same query key  
🔲 **Mock Data Removal**: Verify and remove production placeholders

## Validation Criteria

### Definition of Done (Blockers)
1. **No Villa di Roma contamination** visible on Badiali page ❌ **FAILED**
2. **Circle Score consistency** across both widgets ❌ **UNKNOWN**  
3. **Single Rating UI** with correct restaurant name ❌ **FAILED**
4. **Real data in Lists/Similar** or proper empty states ✅ **PARTIAL**

### Success Metrics
- Debug endpoint shows matching restaurant names
- Circle Score > 0 when user has ratings  
- All UI widgets reference same canonical data source
- No cross-restaurant data leakage

## Next Steps (Phase 1)

1. **Implement canonical rating binding** - Prevent wrong restaurant names
2. **Add database constraints** - Unique Google Place ID constraint  
3. **Create unified Circle Score endpoint** - Single source of truth
4. **Add test data filtering** - Global `is_test != TRUE` enforcement
5. **Frontend standardization** - Unified data access hooks

---

**Evidence Collection Complete**: Ready for Phase 1 systematic fixes implementation