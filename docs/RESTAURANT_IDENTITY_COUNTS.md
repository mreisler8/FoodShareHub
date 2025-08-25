# Restaurant Identity Data Audit
**Date:** August 12, 2025
**Status:** Critical data contamination identified

## Identity Coverage
- **Restaurants without Google Place ID:** 41
- **Restaurants with Google Place ID:** 1
- **Duplicate Place ID mappings:** 0 (good)

## Critical Data Contamination Found

### Test Data Contamination
**Cross-contamination detected:** Rating ID 1 ("Universal system test for Villa di Roma") and Rating ID 7 ("Pizzeria Badiali") both use the same Google Place ID: `ChIJuQdEYaE1K4gRSb-QHzZpGss`

### Orphaned Ratings Analysis
- **Ratings with Place ID only (no restaurant_id):** 3
- **Sample contaminated data:**
  - ID 1: Villa di Roma (test data)
  - ID 5: PAI restaurant 
  - ID 7: Pizzeria Badiali (using Villa di Roma's Place ID)

## Root Cause
The system allows multiple restaurant identities to share the same Google Place ID, causing rating lookup by Place ID to return incorrect cross-referenced data. When users search "Badiali," they see Villa di Roma's test rating.

## Impact
- **User Trust:** Customers see wrong restaurant information
- **Data Integrity:** Circle Score calculations inconsistent 
- **System Reliability:** Same Place ID serving different restaurant data

## Required Actions
1. Implement strict identity binding (restaurant_id + google_place_id)
2. Quarantine test data with `is_test = true` flag
3. Create canonical identity resolution system
4. Unify Circle Score endpoints to prevent cache inconsistencies
5. Clean up cross-contaminated ratings

**Priority:** CRITICAL - Must fix before production deployment