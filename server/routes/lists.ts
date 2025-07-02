
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authenticate } from '../auth';
import { restaurantLists, restaurantListItems, restaurants } from '../../shared/schema';

const router = Router();

// Validation schemas
const createListSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  circleId: z.number().nullable().optional(),
  visibility: z.enum(['public', 'circle']).default('public'),
});

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  visibility: z.enum(['public', 'circle']).optional(),
});

const createListItemSchema = z.object({
  restaurantId: z.number(),
  rating: z.number().min(1).max(5).optional(),
  liked: z.string().optional(),
  disliked: z.string().optional(),
  notes: z.string().optional(),
  position: z.number().optional(),
});

const updateListItemSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  liked: z.string().optional(),
  disliked: z.string().optional(),
  notes: z.string().optional(),
  position: z.number().optional(),
});

// POST /api/lists - Create a new list
router.post('/', authenticate, async (req, res) => {
  try {
    const data = createListSchema.parse(req.body);
    const userId = req.user.id;

    const [list] = await db
      .insert(restaurantLists)
      .values({
        name: data.name,
        description: data.description || null,
        createdById: userId,
        circleId: data.circleId || null,
        visibility: data.visibility,
      })
      .returning();

    res.json(list);
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(400).json({ error: 'Failed to create list' });
  }
});

// GET /api/lists/:listId - Get list with items
router.get('/:listId', authenticate, async (req, res) => {
  try {
    const listId = Number(req.params.listId);
    
    // Get list metadata
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(restaurantLists.id.eq(listId));

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Get list items with restaurant details
    const items = await db
      .select({
        id: restaurantListItems.id,
        restaurantId: restaurantListItems.restaurantId,
        rating: restaurantListItems.rating,
        liked: restaurantListItems.liked,
        disliked: restaurantListItems.disliked,
        notes: restaurantListItems.notes,
        position: restaurantListItems.position,
        createdAt: restaurantListItems.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          category: restaurants.category,
          price_range: restaurants.price_range,
        }
      })
      .from(restaurantListItems)
      .leftJoin(restaurants, restaurants.id.eq(restaurantListItems.restaurantId))
      .where(restaurantListItems.listId.eq(listId))
      .orderBy(restaurantListItems.position);

    res.json({ ...list, items });
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// PUT /api/lists/:listId - Update list metadata
router.put('/:listId', authenticate, async (req, res) => {
  try {
    const listId = Number(req.params.listId);
    const data = updateListSchema.parse(req.body);
    const userId = req.user.id;

    // Check if user owns the list
    const [existingList] = await db
      .select()
      .from(restaurantLists)
      .where(
        restaurantLists.id.eq(listId)
        .and(restaurantLists.createdById.eq(userId))
      );

    if (!existingList) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    const [updatedList] = await db
      .update(restaurantLists)
      .set({
        name: data.name ?? existingList.name,
        description: data.description ?? existingList.description,
        visibility: data.visibility ?? existingList.visibility,
      })
      .where(restaurantLists.id.eq(listId))
      .returning();

    res.json(updatedList);
  } catch (error) {
    console.error('Error updating list:', error);
    res.status(400).json({ error: 'Failed to update list' });
  }
});

// DELETE /api/lists/:listId - Delete list
router.delete('/:listId', authenticate, async (req, res) => {
  try {
    const listId = Number(req.params.listId);
    const userId = req.user.id;

    // Check if user owns the list
    const [existingList] = await db
      .select()
      .from(restaurantLists)
      .where(
        restaurantLists.id.eq(listId)
        .and(restaurantLists.createdById.eq(userId))
      );

    if (!existingList) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    // Delete list items first
    await db
      .delete(restaurantListItems)
      .where(restaurantListItems.listId.eq(listId));

    // Delete the list
    await db
      .delete(restaurantLists)
      .where(restaurantLists.id.eq(listId));

    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// POST /api/lists/:listId/items - Add item to list
router.post('/:listId/items', authenticate, async (req, res) => {
  try {
    const listId = Number(req.params.listId);
    const data = createListItemSchema.parse(req.body);
    const userId = req.user.id;

    // Check if list exists and user has access
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(restaurantLists.id.eq(listId));

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
        position: data.position || 0,
      })
      .returning();

    res.json(item);
  } catch (error) {
    console.error('Error adding item to list:', error);
    res.status(400).json({ error: 'Failed to add item to list' });
  }
});

// PUT /api/lists/:listId/items/:itemId - Update list item
router.put('/:listId/items/:itemId', authenticate, async (req, res) => {
  try {
    const listId = Number(req.params.listId);
    const itemId = Number(req.params.itemId);
    const data = updateListItemSchema.parse(req.body);

    // Check if item exists in the list
    const [existingItem] = await db
      .select()
      .from(restaurantListItems)
      .where(
        restaurantListItems.id.eq(itemId)
        .and(restaurantListItems.listId.eq(listId))
      );

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const [updatedItem] = await db
      .update(restaurantListItems)
      .set({
        rating: data.rating ?? existingItem.rating,
        liked: data.liked ?? existingItem.liked,
        disliked: data.disliked ?? existingItem.disliked,
        notes: data.notes ?? existingItem.notes,
        position: data.position ?? existingItem.position,
      })
      .where(restaurantListItems.id.eq(itemId))
      .returning();

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating list item:', error);
    res.status(400).json({ error: 'Failed to update list item' });
  }
});

// DELETE /api/lists/:listId/items/:itemId - Remove item from list
router.delete('/:listId/items/:itemId', authenticate, async (req, res) => {
  try {
    const listId = Number(req.params.listId);
    const itemId = Number(req.params.itemId);

    // Check if item exists in the list
    const [existingItem] = await db
      .select()
      .from(restaurantListItems)
      .where(
        restaurantListItems.id.eq(itemId)
        .and(restaurantListItems.listId.eq(listId))
      );

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await db
      .delete(restaurantListItems)
      .where(restaurantListItems.id.eq(itemId));

    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing item from list:', error);
    res.status(500).json({ error: 'Failed to remove item from list' });
  }
});

export default router;
