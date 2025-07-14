
import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { savedLists, restaurantLists, users } from '../../shared/schema';

const router = Router();

// GET /api/saved-lists - Get user's saved lists
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const userSavedLists = await db
      .select({
        id: savedLists.id,
        listId: savedLists.listId,
        savedAt: savedLists.savedAt,
        list: {
          id: restaurantLists.id,
          name: restaurantLists.name,
          description: restaurantLists.description,
          createdById: restaurantLists.createdById,
          tags: restaurantLists.tags,
          type: restaurantLists.type,
          coverImage: restaurantLists.coverImage,
          primaryLocation: restaurantLists.primaryLocation,
          viewCount: restaurantLists.viewCount,
          saveCount: restaurantLists.saveCount,
          createdAt: restaurantLists.createdAt,
        },
        creator: {
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        }
      })
      .from(savedLists)
      .innerJoin(restaurantLists, eq(savedLists.listId, restaurantLists.id))
      .innerJoin(users, eq(restaurantLists.createdById, users.id))
      .where(eq(savedLists.userId, userId))
      .orderBy(desc(savedLists.savedAt));

    res.json(userSavedLists);
  } catch (error) {
    console.error('Error fetching saved lists:', error);
    res.status(500).json({ error: 'Failed to fetch saved lists' });
  }
});

// POST /api/saved-lists - Save a list (legacy endpoint)
router.post('/', authenticate, async (req, res) => {
  try {
    const { listId } = req.body;
    const userId = req.user!.id;

    if (!listId) {
      return res.status(400).json({ error: 'List ID is required' });
    }

    // Check if list exists
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Don't allow users to save their own lists
    if (list.createdById === userId) {
      return res.status(400).json({ error: 'Cannot save your own list' });
    }

    // Check if already saved
    const [existingSave] = await db
      .select()
      .from(savedLists)
      .where(and(
        eq(savedLists.listId, listId),
        eq(savedLists.userId, userId)
      ));

    if (existingSave) {
      return res.status(409).json({ error: 'List already saved' });
    }

    // Save the list
    const [savedList] = await db
      .insert(savedLists)
      .values({
        listId,
        userId,
      })
      .returning();

    res.json({ success: true, savedList });
  } catch (error) {
    console.error('Error saving list:', error);
    res.status(500).json({ error: 'Failed to save list' });
  }
});

// DELETE /api/saved-lists/:listId - Remove a list from saved lists (legacy endpoint)
router.delete('/:listId', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const userId = req.user!.id;

    const deletedRows = await db
      .delete(savedLists)
      .where(and(
        eq(savedLists.listId, listId),
        eq(savedLists.userId, userId)
      ))
      .returning();

    if (deletedRows.length === 0) {
      return res.status(404).json({ error: 'Saved list not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing saved list:', error);
    res.status(500).json({ error: 'Failed to remove saved list' });
  }
});

// GET /api/saved-lists/check/:listId - Check if a list is saved by the user
router.get('/check/:listId', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const userId = req.user!.id;

    const [savedList] = await db
      .select()
      .from(savedLists)
      .where(and(
        eq(savedLists.listId, listId),
        eq(savedLists.userId, userId)
      ));

    res.json({ isSaved: !!savedList });
  } catch (error) {
    console.error('Error checking saved list status:', error);
    res.status(500).json({ error: 'Failed to check saved list status' });
  }
});

export default router;
