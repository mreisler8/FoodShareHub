/**
 * V2 Schema Extensions for Lists MVP
 * 
 * Additive-only database migrations for backward compatibility
 */

import { pgTable, serial, text, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================================================
// V2 VISIBILITY SYSTEM
// ============================================================================

export const visibilityV2Enum = pgEnum('visibility_v2', [
  'private',   // Only owner can see
  'public',    // Anyone can see  
  'followers', // Only followers can see
  'circle'     // Only specified circle members can see
]);

// ============================================================================
// EXTENDED LISTS TABLE (V2 FIELDS)
// ============================================================================

// Note: This extends the existing lists table with additive fields only
export const listsV2Extensions = {
  // V2 visibility system (replaces legacy boolean fields)
  visibilityV2: visibilityV2Enum('visibility_v2'),
  visibilityCircleIds: integer('visibility_circle_ids').array(),
  
  // Metadata for migration tracking
  migratedToV2: boolean('migrated_to_v2').default(false),
  migrationTimestamp: timestamp('migration_timestamp'),
} as const;

// ============================================================================
// ZOD SCHEMAS FOR V2 ENDPOINTS
// ============================================================================

export const listVisibilityV2Schema = z.object({
  visibility: z.enum(['private', 'public', 'followers', 'circle']),
  visibilityCircleIds: z.array(z.number()).optional().nullable(),
});

export const createListV2Schema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().optional().nullable(),
  visibility: z.enum(['private', 'public', 'followers', 'circle']).default('private'),
  visibilityCircleIds: z.array(z.number()).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export const updateListV2Schema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
  description: z.string().optional().nullable(),
  visibility: z.enum(['private', 'public', 'followers', 'circle']).optional(),
  visibilityCircleIds: z.array(z.number()).optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export const saveStatusResponseSchema = z.object({
  saved: z.boolean(),
});

export const paginatedListsResponseSchema = z.object({
  results: z.array(z.any()), // Will be typed as List[] in usage
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListVisibilityV2 = z.infer<typeof listVisibilityV2Schema>;
export type CreateListV2Input = z.infer<typeof createListV2Schema>;
export type UpdateListV2Input = z.infer<typeof updateListV2Schema>;
export type SaveStatusResponse = z.infer<typeof saveStatusResponseSchema>;
export type PaginatedListsResponse = z.infer<typeof paginatedListsResponseSchema>;

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

export const migrationHelpers = {
  /**
   * Convert legacy list fields to V2 visibility
   */
  legacyToV2Visibility: (list: {
    makePublic?: boolean;
    isPublic?: boolean;
    shareWithCircle?: boolean;
    circleId?: number;
    visibility?: string;
  }): { visibility: 'private' | 'public' | 'followers' | 'circle'; visibilityCircleIds: number[] | null } => {
    
    // If V2 visibility already exists, use it
    if (list.visibility && ['private', 'public', 'followers', 'circle'].includes(list.visibility)) {
      return {
        visibility: list.visibility as 'private' | 'public' | 'followers' | 'circle',
        visibilityCircleIds: list.visibility === 'circle' && list.circleId ? [list.circleId] : null
      };
    }
    
    // Legacy migration logic
    if (list.makePublic || list.isPublic) {
      return { visibility: 'public', visibilityCircleIds: null };
    }
    
    if (list.shareWithCircle && list.circleId) {
      return { visibility: 'circle', visibilityCircleIds: [list.circleId] };
    }
    
    // Try to detect followers from JSON visibility field
    if (typeof list.visibility === 'string') {
      try {
        const parsed = JSON.parse(list.visibility);
        if (parsed.level === 'followers') {
          return { visibility: 'followers', visibilityCircleIds: null };
        }
      } catch {
        // JSON parse failed, continue with default
      }
    }
    
    return { visibility: 'private', visibilityCircleIds: null };
  },
  
  /**
   * Validate circle access for visibility
   */
  validateCircleAccess: (visibility: string, circleIds: number[] | null): boolean => {
    if (visibility === 'circle') {
      return Array.isArray(circleIds) && circleIds.length > 0;
    }
    return true;
  }
};

export default {
  visibilityV2Enum,
  listsV2Extensions,
  listVisibilityV2Schema,
  createListV2Schema,
  updateListV2Schema,
  saveStatusResponseSchema,
  paginatedListsResponseSchema,
  migrationHelpers,
};