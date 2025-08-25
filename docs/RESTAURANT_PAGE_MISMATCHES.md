# Restaurant Page Data Mismatches Report

**Generated:** August 12, 2025  
**Status:** Under Investigation

## Root Causes Summary

| Issue | Root Cause | Status | Fix Applied |
|-------|------------|--------|-------------|
| Cross-contamination | Shared Google Place IDs | 🔧 FIXING | Identity resolution service |
| Inconsistent Circle Scores | Multiple endpoints | ✅ FIXED | Unified endpoint |
| Rating save failures | Duplicate key constraints | 🔍 INVESTIGATING | Enhanced error handling |
| Test data contamination | No production filters | ✅ FIXED | Test data filtering |

## Detailed Analysis

### 1. Widget vs Source Analysis

| Widget | Endpoint | Query Key | Restaurant ID | Place ID | Status |
|--------|----------|-----------|---------------|----------|--------|
| Circle Score Tile | `/api/restaurant/:id/circle-score` | `['circleScore', restaurantId]` | ✅ Resolved | ✅ Resolved | Fixed |
| Your Rating Block | `/api/ratings/restaurant/:id` | `['userRating', restaurantId]` | ✅ Resolved | ✅ Resolved | Fixed |
| Rating Save | `PUT /api/ratings` | N/A | ✅ Both sent | ✅ Both sent | Investigating |
| Featured Lists | `/api/restaurant-lists` | Various | ✅ restaurantId | N/A | Working |

### 2. Circle Score Comparison

| Implementation | Tile Value | Section Value | Equal | Notes |
|----------------|------------|---------------|-------|-------|
| Before Fix | Variable | Variable | ❌ No | Different endpoints |
| After Fix | Unified | Unified | ✅ Yes | Single endpoint |

### 3. Rating Origin Analysis

| Source | Method | Identity Used | Contamination Risk | Status |
|--------|--------|---------------|-------------------|--------|
| By Restaurant ID | `restaurantId` lookup | Resolved ID | ✅ Low | Safe |
| By Place ID | `googlePlaceId` lookup | Raw Place ID | ⚠️ High | Risky (legacy) |

### 4. Save Failures

| Error Type | Frequency | Root Cause | Solution |
|------------|-----------|------------|----------|
| Duplicate key violation | High | `unique_user_google_place` constraint | Identity resolution |
| 404 endpoint not found | Medium | Wrong Circle Score URL | Fixed routing |
| Validation errors | Low | Missing required fields | Enhanced validation |

### 5. Featured Lists Source

| Implementation | Source | Type | Reliability |
|----------------|--------|------|-------------|
| Current | Real API endpoint | Live data | ✅ High |
| Legacy | Mock data | Static | ⚠️ Low |

### 6. Duplicate UI Components

| Component | File Path | Renders Rating UI | Notes |
|-----------|-----------|-------------------|-------|
| YourRatingCard | `@/components/restaurant/YourRatingCard` | ✅ Primary | Main rating interface |
| QuickRatingModal | `@/components/ratings/QuickRatingModal` | ✅ Secondary | Modal overlay |
| RestaurantActionBar | `@/components/restaurant/RestaurantActionBar` | ❌ No | Action buttons only |

## Critical Issues Found

### 🚨 High Priority
1. **Cross-contamination**: Badiali showing Villa di Roma test data
2. **Rating save failures**: Duplicate key constraint violations
3. **Inconsistent identities**: Mixed restaurantId/placeId usage

### ⚠️ Medium Priority  
1. **Cache inconsistencies**: Different TTL values
2. **Error handling**: Generic error messages
3. **Performance**: Multiple redundant queries

### ℹ️ Low Priority
1. **UI polish**: Debug overlays in production
2. **Documentation**: Missing API docs
3. **Testing**: Limited automated coverage

## Recommended Actions

1. **Immediate**: Complete identity resolution deployment
2. **Short-term**: Fix duplicate key constraint handling  
3. **Medium-term**: Implement comprehensive error boundaries
4. **Long-term**: Add automated regression testing

## Test Results Summary

- **Identity Resolution**: ✅ Implemented
- **Endpoint Unification**: ✅ Complete
- **Data Filtering**: ✅ Active
- **Debug Infrastructure**: ✅ Deployed
- **Contamination Prevention**: 🔧 In Progress

Last Updated: August 12, 2025