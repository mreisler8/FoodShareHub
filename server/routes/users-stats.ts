import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';
import { posts, users, circleMembers, userFollowers, restaurantLists } from '../../shared/schema.js';
import { eq, sql, count } from 'drizzle-orm';

const router = Router();

// Get user statistics for profile display
router.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Get followers count
    const followersResult = await db
      .select({ count: count() })
      .from(userFollowers)
      .where(eq(userFollowers.followingId, userId));

    // Get following count  
    const followingResult = await db
      .select({ count: count() })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));

    // Get list count from restaurantLists table
    const listCountResult = await db
      .select({ count: count() })
      .from(restaurantLists)
      .where(eq(restaurantLists.createdById, userId));

    // Get post/review count
    const reviewCountResult = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.userId, userId));

    // Get circle count (as member)
    const circleCountResult = await db
      .select({ count: count() })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));

    const stats = {
      followers: followersResult[0]?.count || 0,
      following: followingResult[0]?.count || 0,
      lists: listCountResult[0]?.count || 0,
      reviewCount: reviewCountResult[0]?.count || 0,
      circleCount: circleCountResult[0]?.count || 0,
      isFollowing: false // This should be determined by checking if current user follows the profile user
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;