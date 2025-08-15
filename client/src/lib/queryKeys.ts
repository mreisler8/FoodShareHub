/**
 * Centralized React Query Key Management
 * 
 * All query keys use hierarchical array structure for proper cache invalidation.
 * 
 * Pattern:
 * - Collections: ['lists'], ['saved-lists']  
 * - User-specific: ['lists', 'user', userId]
 * - Single entities: ['lists', listId]
 * - Nested resources: ['lists', listId, 'items']
 * - Status checks: ['saved-lists', listId]
 */

import { useQueryClient } from '@tanstack/react-query';

// ============================================================================
// QUERY KEY FACTORIES
// ============================================================================

export const queryKeys = {
  // Collections
  lists: () => ['lists'] as const,
  savedLists: () => ['saved-lists'] as const,
  
  // User-specific collections  
  userLists: (userId: number) => ['lists', 'user', userId] as const,
  userSavedLists: (userId: number) => ['saved-lists', 'user', userId] as const,
  
  // Single list
  list: (listId: number) => ['lists', listId] as const,
  listItems: (listId: number) => ['lists', listId, 'items'] as const,
  
  // Save status (user-specific)
  saveStatus: (listId: number) => ['saved-lists', listId] as const,
  
  // Pagination cursors
  listsPaginated: (cursor?: string) => ['lists', 'paginated', cursor || 'initial'] as const,
  userListsPaginated: (userId: number, cursor?: string) => 
    ['lists', 'user', userId, 'paginated', cursor || 'initial'] as const,
} as const;

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

export function useListCacheHelpers() {
  const queryClient = useQueryClient();
  
  return {
    /**
     * Invalidate specific list and its items
     */
    invalidateList: (listId: number) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.listItems(listId) });
    },
    
    /**
     * Invalidate all list collections 
     */
    invalidateCollections: (userId?: number) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedLists() });
      
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userLists(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.userSavedLists(userId) });
      }
      
      // Invalidate all paginated results
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'lists' && 
          query.queryKey.includes('paginated')
      });
    },
    
    /**
     * Invalidate save status for specific list
     */
    invalidateSaveStatus: (listId: number, userId?: number) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saveStatus(listId) });
      
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSavedLists(userId) });
      }
    },
    
    /**
     * Complete invalidation after list creation
     */
    invalidateAfterCreate: (userId?: number) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userLists(userId) });
      }
    },
    
    /**
     * Invalidate after items change (add, reorder, delete)
     */
    invalidateAfterItemsChange: (listId: number) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listItems(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.list(listId) }); // Update item count, etc.
    },
    
    /**
     * Complete cache reset (use sparingly)
     */
    resetListsCache: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'lists' || 
          query.queryKey[0] === 'saved-lists'
      });
    }
  };
}

// ============================================================================
// LEGACY MIGRATION UTILITIES  
// ============================================================================

export const LegacyMigration = {
  /**
   * Clean up old string-based query keys that may cause conflicts
   */
  cleanupLegacyKeys: (queryClient: ReturnType<typeof useQueryClient>) => {
    // Remove problematic string-based keys
    const legacyPatterns = [
      '/api/lists/',
      '/api/saved-lists/',
      'lists-',
      'saved-lists-'
    ];
    
    legacyPatterns.forEach(pattern => {
      queryClient.invalidateQueries({
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].includes(pattern)
      });
    });
  },
  
  /**
   * Migrate existing cache entries to new key structure
   */
  migrateToV2Keys: (queryClient: ReturnType<typeof useQueryClient>) => {
    // Clear all potentially conflicting cache entries
    queryClient.clear();
  }
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type QueryKeys = typeof queryKeys;
export type ListCacheHelpers = ReturnType<typeof useListCacheHelpers>;