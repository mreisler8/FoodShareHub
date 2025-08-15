/**
 * Visibility Normalization Utilities
 * 
 * Provides backward-compatible visibility reading and normalization
 * for Lists MVP with safe migration path.
 */

import { isFeatureEnabled } from '../feature-flags';

export type NormalizedVisibility = 'public' | 'private' | 'followers' | 'circle';

export interface VisibilityResult {
  visibility: NormalizedVisibility;
  visibilityCircleIds?: number[] | null;
}

export interface LegacyListData {
  visibilityV2?: string | null;
  visibilityCircleIds?: number[] | null;
  // Legacy fields
  makePublic?: boolean | null;
  isPublic?: boolean | null;
  shareWithCircle?: boolean | null;
  circleId?: number | null;
  visibility?: any; // JSON or string
}

/**
 * Normalize visibility from any list data source
 * Priority: visibilityV2 > legacy fields > default private
 */
export function normalizeVisibility(listData: LegacyListData): VisibilityResult {
  // Use V2 visibility if available and feature flag enabled
  if (isFeatureEnabled('LISTS_VISIBILITY_V2') && listData.visibilityV2) {
    const visibility = listData.visibilityV2 as NormalizedVisibility;
    return {
      visibility,
      visibilityCircleIds: visibility === 'circle' ? listData.visibilityCircleIds : null,
    };
  }

  // Fallback to legacy visibility logic
  return normalizeLegacyVisibility(listData);
}

/**
 * Derive visibility from legacy fields
 */
function normalizeLegacyVisibility(listData: LegacyListData): VisibilityResult {
  // Priority order based on requirements:
  
  // 1. If makePublic=true OR isPublic=true → 'public'
  if (listData.makePublic || listData.isPublic) {
    return {
      visibility: 'public',
      visibilityCircleIds: null,
    };
  }
  
  // 2. If shareWithCircle=true AND circleId IS NOT NULL → 'circle'
  if (listData.shareWithCircle && listData.circleId) {
    return {
      visibility: 'circle',
      visibilityCircleIds: [listData.circleId],
    };
  }
  
  // 3. Check legacy visibility JSON for followers
  if (listData.visibility) {
    try {
      const vis = typeof listData.visibility === 'string' 
        ? JSON.parse(listData.visibility) 
        : listData.visibility;
      
      if (vis?.followers === true) {
        return {
          visibility: 'followers',
          visibilityCircleIds: null,
        };
      }
      
      // Check for circle IDs in legacy visibility
      if (vis?.circleIds && Array.isArray(vis.circleIds) && vis.circleIds.length > 0) {
        return {
          visibility: 'circle',
          visibilityCircleIds: vis.circleIds,
        };
      }
    } catch (e) {
      console.warn(`Invalid visibility JSON for list:`, listData.visibility);
    }
  }
  
  // 4. Default to 'private'
  return {
    visibility: 'private',
    visibilityCircleIds: null,
  };
}

/**
 * Transform database list result to include normalized visibility
 * for API responses
 */
export function transformListResponse(dbList: any): any {
  const { visibility, visibilityCircleIds } = normalizeVisibility(dbList);
  
  return {
    ...dbList,
    visibility,
    visibilityCircleIds: visibilityCircleIds || null,
    // Keep legacy fields for backward compatibility but don't expose in new APIs
  };
}

/**
 * Check if user has access to list based on normalized visibility
 */
export async function checkListAccess(
  listData: LegacyListData, 
  userId: number | null,
  checkCircleAccess: (circleIds: number[], userId: number) => Promise<boolean>,
  checkFollowsAccess: (ownerId: number, userId: number) => Promise<boolean>
): Promise<boolean> {
  const { visibility, visibilityCircleIds } = normalizeVisibility(listData);
  
  // No user ID means anonymous access
  if (!userId) {
    return visibility === 'public';
  }
  
  // Owner always has access
  const ownerId = (listData as any).createdById;
  if (ownerId === userId) {
    return true;
  }
  
  switch (visibility) {
    case 'public':
      return true;
    
    case 'followers':
      return await checkFollowsAccess(ownerId, userId);
    
    case 'circle':
      if (!visibilityCircleIds || visibilityCircleIds.length === 0) {
        return false;
      }
      return await checkCircleAccess(visibilityCircleIds, userId);
    
    case 'private':
    default:
      return false;
  }
}

/**
 * Generate migration report data for visibility normalization
 */
export function generateMigrationReportEntry(listData: LegacyListData): {
  listId: any;
  currentV2: string | null;
  derivedVisibility: NormalizedVisibility;
  derivedCircleIds: number[] | null;
  legacyFields: {
    makePublic?: boolean | null;
    isPublic?: boolean | null;
    shareWithCircle?: boolean | null;
    circleId?: number | null;
    visibility?: any;
  };
} {
  const { visibility, visibilityCircleIds } = normalizeLegacyVisibility(listData);
  
  return {
    listId: (listData as any).id,
    currentV2: listData.visibilityV2 || null,
    derivedVisibility: visibility,
    derivedCircleIds: visibilityCircleIds,
    legacyFields: {
      makePublic: listData.makePublic,
      isPublic: listData.isPublic,
      shareWithCircle: listData.shareWithCircle,
      circleId: listData.circleId,
      visibility: listData.visibility,
    },
  };
}