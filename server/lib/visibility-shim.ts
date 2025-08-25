/**
 * Visibility V2 Runtime Shim
 * 
 * Handles backward compatibility between legacy visibility fields 
 * and the new V2 visibility system. Provides a single source of truth
 * for access control regardless of data format.
 */

export type VisibilityV2Type = 'private' | 'public' | 'followers' | 'circle';

export interface DerivedVisibility {
  type: VisibilityV2Type;
  circleIds: number[] | null;
}

export interface ListRow {
  // V2 fields (preferred)
  visibility_v2?: VisibilityV2Type | null;
  visibility_circle_ids?: number[] | null;
  
  // Legacy fields (fallback) - handle database nulls
  makePublic?: boolean | null;
  shareWithCircle?: boolean | null;
  circleId?: number | null;
  visibility?: string | null;
  isPublic?: boolean | null;
}

/**
 * Derives effective visibility from any list row, preferring V2 over legacy
 */
export function deriveVisibility(list: ListRow): DerivedVisibility {
  // Prefer V2 fields when available
  if (list.visibility_v2) {
    return {
      type: list.visibility_v2,
      circleIds: list.visibility_circle_ids || null
    };
  }

  // Legacy fallback logic (read-only)
  if (list.makePublic || list.isPublic) {
    return { type: 'public', circleIds: null };
  }
  
  if (list.shareWithCircle && list.circleId) {
    return { type: 'circle', circleIds: [list.circleId] };
  }

  // Handle legacy visibility string/JSON
  const legacyVisibility = safeParseLegacyVisibility(list.visibility);
  if (legacyVisibility === 'followers') {
    return { type: 'followers', circleIds: null };
  }

  // Default to private
  return { type: 'private', circleIds: null };
}

/**
 * Safe parsing of legacy visibility field (string or JSON)
 */
function safeParseLegacyVisibility(visibility: string | null | undefined): string | null {
  if (!visibility) return null;
  
  try {
    // Handle JSON format: {"audience": "followers"}
    const parsed = JSON.parse(visibility);
    return parsed.audience || null;
  } catch {
    // Handle plain string format: "followers", "private", etc.
    return visibility.replace(/"/g, ''); // Remove quotes if present
  }
}

/**
 * Checks if user can access a list based on derived visibility and context
 */
export function canAccessList(
  list: ListRow,
  userId: number,
  context: {
    isOwner: boolean;
    isFollower: boolean;
    userCircleIds: number[];
  }
): boolean {
  if (context.isOwner) return true;

  const visibility = deriveVisibility(list);
  
  switch (visibility.type) {
    case 'public':
      return true;
      
    case 'private':
      return false;
      
    case 'followers':
      return context.isFollower;
      
    case 'circle':
      if (!visibility.circleIds?.length) return false;
      return visibility.circleIds.some(circleId => 
        context.userCircleIds.includes(circleId)
      );
      
    default:
      return false; // Fail closed for unknown types
  }
}

/**
 * Normalizes visibility input for API endpoints
 */
export function normalizeVisibilityInput(input: {
  // New V2 format
  visibility_v2?: VisibilityV2Type;
  visibility_circle_ids?: number[];
  
  // Legacy format (for backward compatibility)
  makePublic?: boolean;
  shareWithCircle?: boolean;
  circleId?: number;
  visibility?: string;
}): DerivedVisibility {
  // Prefer new format
  if (input.visibility_v2) {
    return {
      type: input.visibility_v2,
      circleIds: input.visibility_circle_ids || null
    };
  }
  
  // Handle legacy input
  if (input.makePublic) return { type: 'public', circleIds: null };
  if (input.shareWithCircle && input.circleId) {
    return { type: 'circle', circleIds: [input.circleId] };
  }
  if (input.visibility === 'followers') return { type: 'followers', circleIds: null };
  
  return { type: 'private', circleIds: null };
}

/**
 * Feature flag check for V2 writes
 */
export function shouldUseV2Writes(): boolean {
  // Default to true since we've migrated the database
  return process.env.LISTS_VISIBILITY_V2 !== 'false';
}