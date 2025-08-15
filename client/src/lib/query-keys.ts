/**
 * Centralized Query Keys & Cache Invalidation
 * 
 * Standardizes all query keys and provides helpers for consistent
 * cache invalidation across the Lists MVP.
 */

import { queryClient } from './queryClient';

/**
 * Standard query key patterns for Lists MVP
 */
export const QueryKeys = {
  // Collections
  lists: ['lists'] as const,
  userLists: (userId: number | string) => ['lists', 'user', userId] as const,
  savedLists: ['saved-lists'] as const,
  
  // Single items
  list: (listId: number | string) => ['lists', listId] as const,
  listItems: (listId: number | string) => ['lists', listId, 'items'] as const,
  
  // Save status (specific to user)
  saveStatus: (listId: number | string) => ['saved-lists', listId] as const,
  
  // Paginated collections
  paginatedLists: (params?: Record<string, any>) => ['lists', 'paginated', params] as const,
  paginatedUserLists: (userId: number | string, params?: Record<string, any>) => 
    ['lists', 'user', userId, 'paginated', params] as const,
} as const;

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate all list-related queries for a specific list
   */
  invalidateList(listId: number | string) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.list(listId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.listItems(listId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.saveStatus(listId) });
  },

  /**
   * Invalidate all collection queries for a user
   */
  invalidateCollections(userId: number | string) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.lists });
    queryClient.invalidateQueries({ queryKey: QueryKeys.userLists(userId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.savedLists });
    queryClient.invalidateQueries({ queryKey: ['lists', 'paginated'] });
    queryClient.invalidateQueries({ queryKey: ['lists', 'user', userId, 'paginated'] });
  },

  /**
   * Invalidate save status and related queries after save/unsave
   */
  invalidateSaveStatus(listId: number | string, userId?: number | string) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.saveStatus(listId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.savedLists });
    
    // Update list metadata (save counts)
    queryClient.invalidateQueries({ queryKey: QueryKeys.list(listId) });
    
    if (userId) {
      queryClient.invalidateQueries({ queryKey: QueryKeys.userLists(userId) });
    }
  },

  /**
   * Invalidate after creating a new list
   */
  invalidateAfterCreate(userId: number | string) {
    this.invalidateCollections(userId);
  },

  /**
   * Invalidate after updating list details
   */
  invalidateAfterUpdate(listId: number | string, userId: number | string) {
    this.invalidateList(listId);
    this.invalidateCollections(userId);
  },

  /**
   * Invalidate after adding/removing/reordering items
   */
  invalidateAfterItemsChange(listId: number | string) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.listItems(listId) });
    
    // Also invalidate list details (item count may have changed)
    queryClient.invalidateQueries({ queryKey: QueryKeys.list(listId) });
  },

  /**
   * Comprehensive invalidation for major changes
   */
  invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['lists'] });
    queryClient.invalidateQueries({ queryKey: ['saved-lists'] });
  },
} as const;

/**
 * Query key utilities
 */
export const QueryKeyUtils = {
  /**
   * Check if a query key matches a pattern
   */
  matches(queryKey: readonly unknown[], pattern: readonly unknown[]): boolean {
    if (pattern.length > queryKey.length) return false;
    
    return pattern.every((part, index) => queryKey[index] === part);
  },

  /**
   * Get all queries matching a pattern
   */
  getMatchingQueries(pattern: readonly unknown[]) {
    return queryClient.getQueryCache().findAll({ queryKey: pattern });
  },
} as const;

/**
 * Legacy query key migration helpers
 * For upgrading from old inconsistent patterns
 */
export const LegacyMigration = {
  /**
   * Remove old-style query keys that may conflict
   */
  cleanupLegacyKeys() {
    // Remove old string-based keys
    queryClient.removeQueries({ queryKey: ['/api/saved-lists'] });
    queryClient.removeQueries({ queryKey: ['/api/lists'] });
    
    // Remove old user-specific keys that don't follow pattern
    queryClient.removeQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && 
               typeof key[0] === 'string' && 
               key[0].startsWith('/api/lists/user/');
      }
    });
  },
} as const;