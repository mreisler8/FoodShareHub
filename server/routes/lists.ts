import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { restaurantLists, restaurantListItems, restaurants, circleMembers, circleSharedLists } from '../../shared/schema';

const router = Router();

// Enhanced validation schemas with better error messages and security
const createListSchema = z.object({
  name: z.string()
    .min(1, 'List name is required')
    .max(100, 'List name must be less than 100 characters')
    .trim()
    .refine(name => !/[<>\"'&]/g.test(name), {
      message: 'List name contains invalid characters'
    }), // Basic XSS protection
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional()
    .transform(val => val ? val.trim() : val), // Clean whitespace
  circleId: z.number()
    .int('Circle ID must be an integer')
    .positive('Circle ID must be a positive number')
    .max(2147483647, 'Circle ID too large') // Prevent integer overflow
    .nullable()
    .optional(),
  visibility: z.enum(['public', 'circle', 'private'])
    .default('public'),
  isPublic: z.boolean().optional(),
  tags: z.array(
    z.string()
      .max(50, 'Tag must be less than 50 characters')
      .trim()
      .refine(tag => !/[<>\"'&]/g.test(tag), {
        message: 'Tag contains invalid characters'
      })
  )
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  shareWithCircle: z.boolean().optional(),
  makePublic: z.boolean().optional(),
});

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  visibility: z.enum(['public', 'circle']).optional(),
  shareWithCircle: z.boolean().optional(),
  makePublic: z.boolean().optional(),
});

const addItemSchema = z.object({
  restaurantId: z.number(),
  rating: z.number().min(1).max(5).optional(),
  priceAssessment: z.enum(['Great value', 'Fair', 'Overpriced']).optional(),
  liked: z.string().optional(),
  disliked: z.string().optional(),
  notes: z.string().optional(),
  mustTryDishes: z.array(z.string()).optional(),
});

const updateItemSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  priceAssessment: z.enum(['Great value', 'Fair', 'Overpriced']).optional(),
  liked: z.string().optional(),
  disliked: z.string().optional(),
  notes: z.string().optional(),
  mustTryDishes: z.array(z.string()).optional(),
});

// GET /api/lists - Get user's lists with filtering and name search
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const filter = req.query.filter as string;
    const name = req.query.name as string;

    // Handle duplicate name checking
    if (name) {
      const lists = await db
        .select()
        .from(restaurantLists)
        .where(and(
          eq(restaurantLists.name, name),
          eq(restaurantLists.createdById, userId)
        ));
      return res.json(lists);
    }

    if (filter === 'mine') {
      // More efficient approach: use database joins instead of multiple queries
      // This gets all lists the user can access in one optimized query

      try {
        // Single optimized query to get all accessible lists using UNION
        // This is much more efficient than multiple separate queries
        const accessibleLists = await db.execute(sql`
          -- User's own lists
          SELECT DISTINCT 
            rl.id, rl.name, rl.description, rl.created_by_id as "createdById",
            rl.circle_id as "circleId", rl.is_public as "isPublic",
            rl.visibility, rl.share_with_circle as "shareWithCircle",
            rl.make_public as "makePublic", rl.created_at as "createdAt",
            rl.updated_at as "updatedAt", rl.tags, rl.primary_location as "primaryLocation"
          FROM restaurant_lists rl
          WHERE rl.created_by_id = ${userId}
          
          UNION
          
          -- Public lists (not owned by user)
          SELECT DISTINCT 
            rl.id, rl.name, rl.description, rl.created_by_id as "createdById",
            rl.circle_id as "circleId", rl.is_public as "isPublic",
            rl.visibility, rl.share_with_circle as "shareWithCircle",
            rl.make_public as "makePublic", rl.created_at as "createdAt",
            rl.updated_at as "updatedAt", rl.tags, rl.primary_location as "primaryLocation"
          FROM restaurant_lists rl
          WHERE rl.make_public = true 
          AND rl.created_by_id != ${userId}
          
          UNION
          
          -- Circle-shared lists (user is member, not owner, not public)
          SELECT DISTINCT 
            rl.id, rl.name, rl.description, rl.created_by_id as "createdById",
            rl.circle_id as "circleId", rl.is_public as "isPublic",
            rl.visibility, rl.share_with_circle as "shareWithCircle",
            rl.make_public as "makePublic", rl.created_at as "createdAt",
            rl.updated_at as "updatedAt", rl.tags, rl.primary_location as "primaryLocation"
          FROM restaurant_lists rl
          INNER JOIN circle_members cm ON rl.circle_id = cm.circle_id
          WHERE rl.share_with_circle = true
          AND cm.user_id = ${userId}
          AND rl.created_by_id != ${userId}
          AND rl.make_public = false
          
          ORDER BY "createdAt" DESC
        `);

        res.json(accessibleLists.rows || []);
      } catch (dbError) {
        console.error('Database error fetching accessible lists:', dbError);
        res.status(500).json({ 
          error: 'Failed to fetch your lists. Please try again.',
          code: 'DATABASE_ERROR'
        });
      }
    } else {
      // Default: return user's own lists with circle sharing information
      const lists = await db
        .select()
        .from(restaurantLists)
        .where(eq(restaurantLists.createdById, userId));

      // Get circle shared information for all lists
      const listIds = lists.map(list => list.id);
      
      if (listIds.length > 0) {
        const sharedInfo = await db
          .select({
            listId: circleSharedLists.listId,
            circleId: circleSharedLists.circleId
          })
          .from(circleSharedLists)
          .where(inArray(circleSharedLists.listId, listIds));

        // Group shared circles by list ID
        const sharedCirclesByList: Record<number, number[]> = {};
        sharedInfo.forEach(share => {
          if (!sharedCirclesByList[share.listId]) {
            sharedCirclesByList[share.listId] = [];
          }
          sharedCirclesByList[share.listId].push(share.circleId);
        });

        // Get restaurant counts for all lists
        const restaurantCounts = await db
          .select({
            listId: restaurantListItems.listId,
            count: sql<number>`count(*)::int`
          })
          .from(restaurantListItems)
          .where(inArray(restaurantListItems.listId, listIds))
          .groupBy(restaurantListItems.listId);

        const countByList: Record<number, number> = {};
        restaurantCounts.forEach(({ listId, count }) => {
          countByList[listId] = count;
        });

        // Add shared circles and restaurant count to each list
        const listsWithSharing = lists.map(list => ({
          ...list,
          sharedWithCircles: sharedCirclesByList[list.id] || [],
          restaurantCount: countByList[list.id] || 0
        }));

        res.json(listsWithSharing);
      } else {
        res.json(lists);
      }
    }
  } catch (error) {
    console.error('Error fetching lists:', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// POST /api/lists - Create a new list
router.post('/', authenticate, async (req, res) => {
  try {
    const data = createListSchema.parse(req.body);
    const userId = req.user!.id;

    // Check for duplicate name before creating
    const existingLists = await db
      .select()
      .from(restaurantLists)
      .where(and(
        eq(restaurantLists.name, data.name),
        eq(restaurantLists.createdById, userId)
      ))
      .limit(1);

    if (existingLists.length > 0) {
      return res.status(409).json({
        error: 'duplicate_list',
        existingId: existingLists[0].id
      });
    }

    // Handle the frontend's sharing model
    const isPublic = data.makePublic || data.isPublic || false;
    const shareWithCircle = data.shareWithCircle || false;
    const visibility = isPublic ? 'public' : (shareWithCircle ? 'circle' : 'private');

    const [list] = await db
      .insert(restaurantLists)
      .values({
        name: data.name,
        description: data.description || null,
        createdById: userId,
        circleId: data.circleId || null,
        visibility: visibility,
        isPublic: isPublic,
        tags: data.tags || [],
        shareWithCircle: shareWithCircle,
        makePublic: isPublic,
      })
      .returning();

    res.json(list);
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// GET /api/lists/:id - Get specific list with items (with filtering and sorting)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Parse query parameters for filtering and sorting
    const { sort, 'filter[cuisine]': cuisineFilter, 'filter[city]': cityFilter } = req.query;

    // Get list metadata
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Access control: Allow access if:
    // 1. User owns the list
    // 2. List is public (makePublic = true)
    // 3. List is shared with circle and user is member of that circle
    const isOwner = list.createdById === userId;
    const isPublic = list.makePublic === true;

    let hasCircleAccess = false;
    if (list.shareWithCircle && list.circleId) {
      // Check if user is member of the associated circle
      const [circleMember] = await db
        .select()
        .from(circleMembers)
        .where(and(
          eq(circleMembers.circleId, list.circleId),
          eq(circleMembers.userId, userId)
        ));
      hasCircleAccess = !!circleMember;
    }

    if (!isOwner && !isPublic && !hasCircleAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query conditions for filtering
    let queryConditions = [eq(restaurantListItems.listId, listId)];

    if (cuisineFilter) {
      queryConditions.push(eq(restaurants.cuisine, cuisineFilter as string));
    }

    if (cityFilter) {
      queryConditions.push(eq(restaurants.city, cityFilter as string));
    }

    // Optimize with a single efficient query including all needed data
    const sortColumn = sort === 'rating' ? 'rli.rating DESC NULLS LAST' :
                      sort === 'rating_asc' ? 'rli.rating ASC NULLS LAST' :
                      'rli.position ASC';

    const cuisineCondition = cuisineFilter ? sql`AND r.cuisine = ${cuisineFilter}` : sql``;
    const cityCondition = cityFilter ? sql`AND r.city = ${cityFilter}` : sql``;

    const itemsResult = await db.execute(sql`
      SELECT 
        rli.id, rli.list_id as "listId", rli.restaurant_id as "restaurantId",
        rli.rating, rli.price_assessment as "priceAssessment", rli.liked, 
        rli.disliked, rli.notes, rli.must_try_dishes as "mustTryDishes",
        rli.added_by_id as "addedById", rli.position, rli.added_at as "addedAt",
        r.id as "restaurant.id", r.name as "restaurant.name", 
        r.location as "restaurant.location", r.category as "restaurant.category",
        r.price_range as "restaurant.priceRange", r.address as "restaurant.address",
        r.cuisine as "restaurant.cuisine", r.city as "restaurant.city",
        r.image_url as "restaurant.imageUrl", r.phone as "restaurant.phone"
      FROM restaurant_list_items rli
      LEFT JOIN restaurants r ON rli.restaurant_id = r.id
      WHERE rli.list_id = ${listId}
      ${cuisineCondition}
      ${cityCondition}
      ORDER BY ${sql.raw(sortColumn)}
    `);

    const items = itemsResult.rows || [];

    // Calculate aggregated stats
    const stats = {
      totalItems: items.length,
      avgRating: items.length > 0 ? items.reduce((sum, item) => sum + (item.rating || 0), 0) / items.filter(item => item.rating).length : 0,
      cuisines: [...new Set(items.map(item => item.restaurant.cuisine).filter(Boolean))],
      cities: [...new Set(items.map(item => item.restaurant.city).filter(Boolean))],
    };

    res.json({
      ...list,
      items,
      stats
    });
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// PUT /api/lists/:id - Update list metadata
router.put('/:id', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const data = updateListSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if list exists and user owns it
    const [existingList] = await db
      .select()
      .from(restaurantLists)
      .where(and(
        eq(restaurantLists.id, listId),
        eq(restaurantLists.createdById, userId)
      ));

    if (!existingList) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    // Handle visibility logic consistently with creation
    let updateData = { ...data };
    if (data.shareWithCircle !== undefined || data.makePublic !== undefined) {
      const shareWithCircle = data.shareWithCircle !== undefined ? data.shareWithCircle : existingList.shareWithCircle;
      const makePublic = data.makePublic !== undefined ? data.makePublic : existingList.makePublic;

      updateData.visibility = makePublic ? 'public' : (shareWithCircle ? 'circle' : 'private');
      updateData.isPublic = makePublic;
    }

    const [updatedList] = await db
      .update(restaurantLists)
      .set(updateData)
      .where(eq(restaurantLists.id, listId))
      .returning();

    res.json(updatedList);
  } catch (error) {
    console.error('Error updating list:', error);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// DELETE /api/lists/:id - Delete a list
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Check if list exists and user owns it
    const [existingList] = await db
      .select()
      .from(restaurantLists)
      .where(and(
        eq(restaurantLists.id, listId),
        eq(restaurantLists.createdById, userId)
      ));

    if (!existingList) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    // Delete all list items first
    await db
      .delete(restaurantListItems)
      .where(eq(restaurantListItems.listId, listId));

    // Delete the list
    await db
      .delete(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// POST /api/lists/:id/items - Add restaurant to list
router.post('/:id/items', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const data = addItemSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if list exists and user has access
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // For now, allow anyone to add to public lists, only owners for circle lists
    if (list.visibility === 'circle' && list.createdById !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [item] = await db
      .insert(restaurantListItems)
      .values({
        listId,
        restaurantId: data.restaurantId,
        rating: data.rating || null,
        liked: data.liked || null,
        disliked: data.disliked || null,
        notes: data.notes || null,
        mustTryDishes: data.mustTryDishes || [],
        addedById: userId,
      })
      .returning();

    res.json(item);
  } catch (error) {
    console.error('Error adding item to list:', error);
    res.status(500).json({ error: 'Failed to add item to list' });
  }
});

// PUT /api/lists/items/:itemId - Update list item
router.put('/items/:itemId', authenticate, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const data = updateItemSchema.parse(req.body);

    // Check if item exists
    const [existingItem] = await db
      .select()
      .from(restaurantListItems)
      .where(eq(restaurantListItems.id, itemId));

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const [updatedItem] = await db
      .update(restaurantListItems)
      .set(data)
      .where(eq(restaurantListItems.id, itemId))
      .returning();

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating list item:', error);
    res.status(500).json({ error: 'Failed to update list item' });
  }
});

// DELETE /api/lists/items/:itemId - Remove item from list
router.delete('/items/:itemId', authenticate, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);

    await db
      .delete(restaurantListItems)
      .where(eq(restaurantListItems.id, itemId));

    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing item from list:', error);
    res.status(500).json({ error: 'Failed to remove item from list' });
  }
});

// GET /api/lists/:id/items - Get list items with filtering and sorting
router.get('/:id/items', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Parse query parameters
    const { sort, 'filter[cuisine]': cuisineFilter, 'filter[city]': cityFilter } = req.query;

    // Verify access to the list
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const isOwner = list.createdById === userId;
    const isPublic = list.makePublic === true;

    let hasCircleAccess = false;
    if (list.shareWithCircle && list.circleId) {
      const [circleMember] = await db
        .select()
        .from(circleMembers)
        .where(and(
          eq(circleMembers.circleId, list.circleId),
          eq(circleMembers.userId, userId)
        ));
      hasCircleAccess = !!circleMember;
    }

    if (!isOwner && !isPublic && !hasCircleAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query conditions for filtering
    let queryConditions = [eq(restaurantListItems.listId, listId)];

    if (cuisineFilter) {
      queryConditions.push(eq(restaurants.cuisine, cuisineFilter as string));
    }

    if (cityFilter) {
      queryConditions.push(eq(restaurants.city, cityFilter as string));
    }

    // Optimize with a single efficient query including all needed data
    const sortColumn = sort === 'rating' ? 'rli.rating DESC NULLS LAST' :
                      sort === 'rating_asc' ? 'rli.rating ASC NULLS LAST' :
                      'rli.position ASC';

    const cuisineCondition = cuisineFilter ? sql`AND r.cuisine = ${cuisineFilter}` : sql``;
    const cityCondition = cityFilter ? sql`AND r.city = ${cityFilter}` : sql``;

    const itemsResult = await db.execute(sql`
      SELECT 
        rli.id, rli.list_id as "listId", rli.restaurant_id as "restaurantId",
        rli.rating, rli.price_assessment as "priceAssessment", rli.liked, 
        rli.disliked, rli.notes, rli.must_try_dishes as "mustTryDishes",
        rli.added_by_id as "addedById", rli.position, rli.added_at as "addedAt",
        r.id as "restaurant.id", r.name as "restaurant.name", 
        r.location as "restaurant.location", r.category as "restaurant.category",
        r.price_range as "restaurant.priceRange", r.address as "restaurant.address",
        r.cuisine as "restaurant.cuisine", r.city as "restaurant.city",
        r.image_url as "restaurant.imageUrl", r.phone as "restaurant.phone"
      FROM restaurant_list_items rli
      LEFT JOIN restaurants r ON rli.restaurant_id = r.id
      WHERE rli.list_id = ${listId}
      ${cuisineCondition}
      ${cityCondition}
      ORDER BY ${sql.raw(sortColumn)}
    `);

    const items = itemsResult.rows || [];

    // Calculate aggregated stats
    const stats = {
      totalItems: items.length,
      avgRating: items.length > 0 ? items.reduce((sum, item) => sum + (item.rating || 0), 0) / items.filter(item => item.rating).length : 0,
      cuisines: [...new Set(items.map(item => item.restaurant.cuisine).filter(Boolean))],
      cities: [...new Set(items.map(item => item.restaurant.city).filter(Boolean))],
    };

    res.json({
      items,
      stats
    });
  } catch (error) {
    console.error('Error fetching list items:', error);
    res.status(500).json({ error: 'Failed to fetch list items' });
  }
});

export default router;