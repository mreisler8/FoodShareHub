import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { restaurantLists, restaurantListItems, restaurants, circleMembers } from '../../shared/schema';

const router = Router();

// Validation schemas
const createListSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  circleId: z.number().nullable().optional(),
  visibility: z.enum(['public', 'circle']).default('public'),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
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
  liked: z.string().optional(),
  disliked: z.string().optional(),
  notes: z.string().optional(),
  mustTryDishes: z.array(z.string()).optional(),
});

const updateItemSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
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
      // Return only lists the user can see per User Story 5 criteria:
      // 1. Lists where shareWithCircle === true and the circle includes the current user
      // 2. PLUS lists where makePublic === true
      // 3. PLUS lists the user owns
      
      // Get all lists
      const allLists = await db
        .select()
        .from(restaurantLists);

      // Filter based on access criteria
      const accessibleLists = [];
      
      for (const list of allLists) {
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
        
        if (isOwner || isPublic || hasCircleAccess) {
          accessibleLists.push(list);
        }
      }
      
      res.json(accessibleLists);
    } else {
      // Default: return user's own lists
      const lists = await db
        .select()
        .from(restaurantLists)
        .where(eq(restaurantLists.createdById, userId));

      res.json(lists);
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

// GET /api/lists/:id - Get specific list with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;
    
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

    // Get list items with restaurant details
    const items = await db
      .select({
        id: restaurantListItems.id,
        listId: restaurantListItems.listId,
        restaurantId: restaurantListItems.restaurantId,
        rating: restaurantListItems.rating,
        liked: restaurantListItems.liked,
        disliked: restaurantListItems.disliked,
        notes: restaurantListItems.notes,
        mustTryDishes: restaurantListItems.mustTryDishes,
        addedById: restaurantListItems.addedById,
        position: restaurantListItems.position,
        addedAt: restaurantListItems.addedAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          category: restaurants.category,
          priceRange: restaurants.priceRange,
          address: restaurants.address,
          cuisine: restaurants.cuisine,
        }
      })
      .from(restaurantListItems)
      .leftJoin(restaurants, eq(restaurantListItems.restaurantId, restaurants.id))
      .where(eq(restaurantListItems.listId, listId));

    res.json({
      ...list,
      items
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

export default router;