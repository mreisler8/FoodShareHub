import { Router } from 'express';
import { authenticate } from '../auth';
import { db } from '../db';
import { listReactions, restaurantLists, users } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// Handle root path - return all reactions or error
router.get(['/', ''], async (req, res) => {
  res.status(400).json({ error: 'List ID required' });
});

// Create new reaction for specific list
router.post('/:listId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const listId = parseInt(req.params.listId);
    const { type: reaction } = req.body;

    if (!listId || isNaN(listId) || !reaction) {
      return res.status(400).json({ error: 'Valid list ID and reaction required' });
    }

    if (!['like', 'love', 'fire', 'clap'].includes(reaction)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Check if user already reacted
    const existingReaction = await db.select()
      .from(listReactions)
      .where(and(
        eq(listReactions.listId, listId),
        eq(listReactions.userId, userId)
      ))
      .limit(1);

    if (existingReaction.length > 0) {
      // Update existing reaction
      await db.update(listReactions)
        .set({ reaction })
        .where(and(
          eq(listReactions.listId, listId),
          eq(listReactions.userId, userId)
        ));
    } else {
      // Create new reaction
      await db.insert(listReactions).values({
        listId,
        userId,
        reaction
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding list reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// GET /api/list-reactions/:listId - Get reactions for a specific list with user status
router.get('/:listId', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const userId = req.user?.id;

    if (!listId || isNaN(listId)) {
      return res.status(400).json({ error: 'Valid List ID required' });
    }

    const reactions = await db.select({
      id: listReactions.id,
      reaction: listReactions.reaction,
      createdAt: listReactions.createdAt,
      userId: listReactions.userId,
      userName: users.name,
      userProfilePicture: users.profilePicture
    })
    .from(listReactions)
    .innerJoin(users, eq(listReactions.userId, users.id))
    .where(eq(listReactions.listId, listId))
    .orderBy(desc(listReactions.createdAt));

    const reactionCounts = await db.select({
      reaction: listReactions.reaction,
      count: sql<number>`COUNT(*)`
    })
    .from(listReactions)
    .where(eq(listReactions.listId, listId))
    .groupBy(listReactions.reaction);

    // Check if current user has reacted
    const userReaction = await db.select()
      .from(listReactions)
      .where(and(
        eq(listReactions.listId, listId),
        eq(listReactions.userId, userId)
      ))
      .limit(1);

    res.json({
      reactions,
      counts: reactionCounts,
      hasReacted: userReaction.length > 0,
      userReaction: userReaction[0] || null
    });
  } catch (error) {
    console.error('Error fetching list reactions:', error);
    res.status(500).json({ error: 'Failed to fetch list reactions' });
  }
});



export default router;