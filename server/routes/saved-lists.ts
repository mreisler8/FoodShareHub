import { Router } from 'express';
import { storage } from '../storage';
import { authenticate } from '../auth';
import { insertSavedListSchema } from '@shared/schema';

const router = Router();

// POST /api/saved-lists - Save a list
router.post('/', authenticate, async (req, res) => {
  try {
    const { listId } = insertSavedListSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if the list is already saved
    const isAlreadySaved = await storage.isListSavedByUser(listId, userId);
    if (isAlreadySaved) {
      return res.status(409).json({ error: 'List is already saved' });
    }

    const savedList = await storage.createSavedList({
      listId,
      userId
    });

    res.status(201).json(savedList);
  } catch (error: any) {
    console.error('Error saving list:', error);
    res.status(500).json({ error: 'Failed to save list' });
  }
});

// DELETE /api/saved-lists/:listId - Unsave a list
router.delete('/:listId', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const userId = req.user!.id;

    await storage.deleteSavedList(listId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error unsaving list:', error);
    res.status(500).json({ error: 'Failed to unsave list' });
  }
});

// GET /api/saved-lists - Get all saved lists for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const savedLists = await storage.getSavedListsByUser(userId);
    res.json(savedLists);
  } catch (error: any) {
    console.error('Error fetching saved lists:', error);
    res.status(500).json({ error: 'Failed to fetch saved lists' });
  }
});

// GET /api/saved-lists/:listId/status - Check if a list is saved by current user
router.get('/:listId/status', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const userId = req.user!.id;

    const isSaved = await storage.isListSavedByUser(listId, userId);
    res.json({ isSaved });
  } catch (error: any) {
    console.error('Error checking saved list status:', error);
    res.status(500).json({ error: 'Failed to check saved list status' });
  }
});



export default router;