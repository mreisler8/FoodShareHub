import { Router } from 'express';
import { eq, desc, and, or } from 'drizzle-orm';
import { db } from '../db';
import { posts, users, restaurants } from '../../shared/schema';
import { requireAuth } from '../auth';

const router = Router();

// Get user's post history for smart nudges
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user's post statistics
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId));

    // Calculate statistics for smart nudges
    const stats = {
      listsCreated: 0, // Will be implemented when we add list posts
      momentsShared: userPosts.filter(p => p.metadata?.postType === 'moment').length,
      dishesRecommended: userPosts.filter(p => p.metadata?.postType === 'dish').length,
      circlesJoined: 0, // Will be implemented with circles integration
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user post history:', error);
    res.status(500).json({ error: 'Failed to fetch post history' });
  }
});

export default router;