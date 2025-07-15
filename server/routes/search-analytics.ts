import { Router } from 'express';
import { authenticate } from '../auth';

const router = Router();

// Track search analytics
router.post('/track', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { query, category = 'all', resultCount = 0, clicked = false, clickedResultId, clickedResultType } = req.body;

    if (!userId || !query) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enhanced analytics logging with structured data
    const analyticsData = {
      userId,
      query: query.trim(),
      category,
      resultCount,
      clicked,
      clickedResultId,
      clickedResultType,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      sessionId: req.sessionID
    };

    console.log('Search Analytics:', analyticsData);

    res.json({ success: true, tracked: analyticsData });
  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ error: 'Failed to track search' });
  }
});

// Get trending searches (simplified version)
router.get('/trending', authenticate, async (req, res) => {
  try {
    // Return mock trending data for now
    const trending = [
      { query: 'pizza', count: 45 },
      { query: 'sushi', count: 32 },
      { query: 'brunch', count: 28 },
      { query: 'date night', count: 24 },
      { query: 'late night', count: 19 }
    ];

    res.json(trending);
  } catch (error) {
    console.error('Error getting trending searches:', error);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

// Get recent searches for authenticated user
router.get('/recent', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return empty array for now - can be enhanced later
    res.json([]);
  } catch (error) {
    console.error('Error getting recent searches:', error);
    res.status(500).json({ error: 'Failed to fetch recent searches' });
  }
});

export default router;