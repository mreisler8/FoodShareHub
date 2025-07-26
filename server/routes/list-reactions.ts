import { Router } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { listReactions, restaurantLists, insertListReactionSchema } from '../../shared/schema';

const router = Router();

// POST /api/list-reactions - Add or toggle reaction to a list
router.post('/', authenticate, async (req, res) => {
  try {
    const { listId, reactionType = 'like' } = insertListReactionSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if user already reacted to this list
    const existingReaction = await db
      .select()
      .from(listReactions)
      .where(and(
        eq(listReactions.listId, listId),
        eq(listReactions.userId, userId)
      ))
      .limit(1);

    let reaction;
    let isNewReaction = false;

    if (existingReaction.length > 0) {
      // Update existing reaction type
      reaction = await db
        .update(listReactions)
        .set({ reactionType, createdAt: new Date() })
        .where(eq(listReactions.id, existingReaction[0].id))
        .returning();
    } else {
      // Create new reaction
      reaction = await db
        .insert(listReactions)
        .values({ listId, userId, reactionType })
        .returning();
      isNewReaction = true;

      // Increment reaction count on the list
      await db
        .update(restaurantLists)
        .set({ 
          reactionCount: sql`${restaurantLists.reactionCount} + 1`
        })
        .where(eq(restaurantLists.id, listId));
    }

    res.status(201).json({
      reaction: reaction[0],
      isNewReaction
    });
  } catch (error: any) {
    console.error('Error adding list reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// DELETE /api/list-reactions/:listId - Remove reaction from a list
router.delete('/:listId', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const userId = req.user!.id;

    // Check if reaction exists
    const existingReaction = await db
      .select()
      .from(listReactions)
      .where(and(
        eq(listReactions.listId, listId),
        eq(listReactions.userId, userId)
      ))
      .limit(1);

    if (existingReaction.length === 0) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    // Delete the reaction
    await db
      .delete(listReactions)
      .where(eq(listReactions.id, existingReaction[0].id));

    // Decrement reaction count on the list
    await db
      .update(restaurantLists)
      .set({ 
        reactionCount: sql`${restaurantLists.reactionCount} - 1`
      })
      .where(eq(restaurantLists.id, listId));

    res.status(204).send();
  } catch (error: any) {
    console.error('Error removing list reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// GET /api/list-reactions/:listId/status - Check if current user reacted to a list
router.get('/:listId/status', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const userId = req.user!.id;

    const reaction = await db
      .select()
      .from(listReactions)
      .where(and(
        eq(listReactions.listId, listId),
        eq(listReactions.userId, userId)
      ))
      .limit(1);

    res.json({
      hasReacted: reaction.length > 0,
      reactionType: reaction.length > 0 ? reaction[0].reactionType : null
    });
  } catch (error: any) {
    console.error('Error checking list reaction status:', error);
    res.status(500).json({ error: 'Failed to check reaction status' });
  }
});

// GET /api/list-reactions/:listId - Get all reactions for a list
router.get('/:listId', async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);

    const reactions = await db
      .select({
        id: listReactions.id,
        reactionType: listReactions.reactionType,
        createdAt: listReactions.createdAt,
        userId: listReactions.userId,
      })
      .from(listReactions)
      .where(eq(listReactions.listId, listId))
      .orderBy(sql`${listReactions.createdAt} DESC`);

    // Group reactions by type for summary
    const reactionSummary = reactions.reduce((acc: Record<string, number>, reaction) => {
      acc[reaction.reactionType] = (acc[reaction.reactionType] || 0) + 1;
      return acc;
    }, {});

    res.json({
      reactions,
      summary: reactionSummary,
      totalCount: reactions.length
    });
  } catch (error: any) {
    console.error('Error fetching list reactions:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

// Check user's reaction status for a list
router.get('/:listId/status', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const listId = parseInt(req.params.listId);

    if (isNaN(listId)) {
      return res.status(400).json({ error: 'Invalid list ID' });
    }

    const reaction = await storage.getUserListReaction(listId, userId);
    res.json({ 
      hasReacted: !!reaction,
      reactionType: reaction?.reactionType || null
    });
  } catch (error) {
    console.error('Error checking reaction status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
