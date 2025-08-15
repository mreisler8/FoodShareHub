/**
 * Pagination Utilities and Endpoints
 * 
 * Provides cursor-based pagination for list collections
 */

import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, asc, sql, inArray, lt, gt } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { restaurantLists, restaurantListItems, circleMembers } from '../../shared/schema';
import { transformListResponse } from '../utils/visibility-normalizer';

const router = Router();

// Pagination query schema
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort: z.enum(['recent', 'popular', 'alphabetical']).default('recent'),
});

// GET /api/lists/paginated - Paginated public lists
router.get('/paginated', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit, cursor, sort } = paginationSchema.parse(req.query);
    
    // Build query conditions
    let conditions = [eq(restaurantLists.visibilityV2 as any, 'public')];
    
    // Add cursor condition based on sort
    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        
        switch (sort) {
          case 'recent':
            conditions.push(lt(restaurantLists.createdAt, new Date(cursorData.createdAt)));
            break;
          case 'popular':
            conditions.push(lt(restaurantLists.saveCount, cursorData.saveCount));
            break;
          case 'alphabetical':
            conditions.push(gt(restaurantLists.name, cursorData.name));
            break;
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
    }

    // Set order based on sort
    let orderBy;
    switch (sort) {
      case 'recent':
        orderBy = desc(restaurantLists.createdAt);
        break;
      case 'popular':
        orderBy = desc(restaurantLists.saveCount);
        break;
      case 'alphabetical':
        orderBy = asc(restaurantLists.name);
        break;
    }

    // Fetch lists
    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        createdById: restaurantLists.createdById,
        visibilityV2: restaurantLists.visibilityV2,
        visibilityCircleIds: restaurantLists.visibilityCircleIds,
        tags: restaurantLists.tags,
        saveCount: restaurantLists.saveCount,
        viewCount: restaurantLists.viewCount,
        createdAt: restaurantLists.createdAt,
        updatedAt: restaurantLists.updatedAt,
        // Legacy fields for backward compatibility
        isPublic: restaurantLists.isPublic,
        makePublic: restaurantLists.makePublic,
        shareWithCircle: restaurantLists.shareWithCircle,
        visibility: restaurantLists.visibility,
      })
      .from(restaurantLists)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit + 1); // Fetch one extra to determine if there are more

    // Separate results from hasMore indicator
    const hasMore = lists.length > limit;
    const results = hasMore ? lists.slice(0, limit) : lists;

    // Generate next cursor if there are more results
    let nextCursor = null;
    if (hasMore) {
      const lastItem = results[results.length - 1];
      const cursorData = {
        id: lastItem.id,
        createdAt: lastItem.createdAt.toISOString(),
        saveCount: lastItem.saveCount || 0,
        name: lastItem.name,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    // Transform results
    const transformedResults = results.map(transformListResponse);

    const duration = Date.now() - startTime;
    console.log(`[PAGINATION] GET /api/lists/paginated - ${duration}ms - Status: 200 - Results: ${results.length} - HasMore: ${hasMore}`);

    res.json({
      results: transformedResults,
      nextCursor,
      hasMore,
      total: results.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PAGINATION] GET /api/lists/paginated - ${duration}ms - Status: 400/500 - Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// GET /api/lists/user/:userId/paginated - Paginated user lists
router.get('/user/:userId/paginated', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = parseInt(req.params.userId);
    const currentUserId = req.user!.id;
    const { limit, cursor, sort } = paginationSchema.parse(req.query);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Only allow users to fetch their own lists (could be extended for public profiles)
    if (userId !== currentUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query conditions
    let conditions = [eq(restaurantLists.createdById, userId)];
    
    // Add cursor condition based on sort
    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        
        switch (sort) {
          case 'recent':
            conditions.push(lt(restaurantLists.updatedAt, new Date(cursorData.updatedAt)));
            break;
          case 'popular':
            conditions.push(lt(restaurantLists.saveCount, cursorData.saveCount));
            break;
          case 'alphabetical':
            conditions.push(gt(restaurantLists.name, cursorData.name));
            break;
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
    }

    // Set order based on sort
    let orderBy;
    switch (sort) {
      case 'recent':
        orderBy = desc(restaurantLists.updatedAt);
        break;
      case 'popular':
        orderBy = desc(restaurantLists.saveCount);
        break;
      case 'alphabetical':
        orderBy = asc(restaurantLists.name);
        break;
    }

    // Fetch lists with item counts
    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        createdById: restaurantLists.createdById,
        visibilityV2: restaurantLists.visibilityV2,
        visibilityCircleIds: restaurantLists.visibilityCircleIds,
        tags: restaurantLists.tags,
        saveCount: restaurantLists.saveCount,
        viewCount: restaurantLists.viewCount,
        createdAt: restaurantLists.createdAt,
        updatedAt: restaurantLists.updatedAt,
        // Legacy fields
        isPublic: restaurantLists.isPublic,
        makePublic: restaurantLists.makePublic,
        shareWithCircle: restaurantLists.shareWithCircle,
        visibility: restaurantLists.visibility,
      })
      .from(restaurantLists)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit + 1);

    // Separate results from hasMore indicator
    const hasMore = lists.length > limit;
    const results = hasMore ? lists.slice(0, limit) : lists;

    // Get item counts for results
    const listIds = results.map(list => list.id);
    let itemCounts: Record<number, number> = {};
    
    if (listIds.length > 0) {
      const counts = await db
        .select({
          listId: restaurantListItems.listId,
          count: sql<number>`count(*)::int`,
        })
        .from(restaurantListItems)
        .where(inArray(restaurantListItems.listId, listIds))
        .groupBy(restaurantListItems.listId);

      counts.forEach(({ listId, count }) => {
        itemCounts[listId] = count;
      });
    }

    // Generate next cursor
    let nextCursor = null;
    if (hasMore) {
      const lastItem = results[results.length - 1];
      const cursorData = {
        id: lastItem.id,
        updatedAt: lastItem.updatedAt.toISOString(),
        saveCount: lastItem.saveCount || 0,
        name: lastItem.name,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    // Transform results with item counts
    const transformedResults = results.map(list => ({
      ...transformListResponse(list),
      itemCount: itemCounts[list.id] || 0,
    }));

    const duration = Date.now() - startTime;
    console.log(`[PAGINATION] GET /api/lists/user/${userId}/paginated - ${duration}ms - Status: 200 - Results: ${results.length}`);

    res.json({
      results: transformedResults,
      nextCursor,
      hasMore,
      total: results.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PAGINATION] GET /api/lists/user/${req.params.userId}/paginated - ${duration}ms - Status: 400/500 - Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch user lists' });
  }
});

export default router;