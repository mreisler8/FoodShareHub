
import { Router } from 'express';
import { authenticate } from '../auth';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '../db';
import { posts, restaurantLists } from '../../shared/schema';

const router = Router();

// GET /api/feed/counts - Get post type counts for feed filters
router.get('/counts', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { scope, circleId } = req.query;

    // For now, return static counts - can be implemented with real data later
    const counts = {
      list: 12,
      moment: 8,
      dish: 5
    };

    res.json(counts);
  } catch (error) {
    console.error('Error fetching feed counts:', error);
    res.status(500).json({ error: 'Failed to fetch feed counts' });
  }
});

export default router;
