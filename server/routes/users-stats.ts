import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';
import { posts, users, circleMembers } from '../../shared/schema.js';
import { eq, sql, count } from 'drizzle-orm';

const router = Router();

// Get user statistics for smart recommendations
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user account age - users table doesn't have created_at, so default to 30 days
    const accountAgeInDays = 30;

    // Get post statistics with proper type casting
    const postStats = await db
      .select({
        totalPosts: count(),
        listCount: sql<number>`count(*) filter (where post_type = 'list')`,
        momentCount: sql<number>`count(*) filter (where post_type = 'moment')`,
        dishCount: sql<number>`count(*) filter (where post_type = 'dish')`
      })
      .from(posts)
      .where(eq(posts.userId, userId));

    // Get last post type
    const lastPost = await db
      .select({
        postType: posts.postType
      })
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(sql`created_at desc`)
      .limit(1);

    // Get circle count
    const circleCountResult = await db
      .select({
        count: count()
      })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));

    const stats = {
      totalPosts: Number(postStats[0]?.totalPosts || 0),
      postTypeBreakdown: {
        list: Number(postStats[0]?.listCount || 0),
        moment: Number(postStats[0]?.momentCount || 0),
        dish: Number(postStats[0]?.dishCount || 0)
      },
      lastPostType: lastPost[0]?.postType || null,
      accountAgeInDays,
      circleCount: Number(circleCountResult[0]?.count || 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;