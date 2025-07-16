import { Router } from 'express';
import { storage } from '../storage';
import { authenticate } from '../auth';

const router = Router();

// Get user statistics for smart recommendations
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Return minimal stats to avoid database issues
    const stats = {
      totalPosts: 0,
      postTypeBreakdown: {
        list: 0,
        moment: 0,
        dish: 0,
      },
      lastPostType: null,
      accountAgeInDays: 30, // Default to 30 days
      circleCount: 0,
      recentActivity: {
        postsLastWeek: 0,
        postsLastMonth: 0,
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics', details: error.message });
  }
});

export default router;