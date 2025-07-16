import { Router } from 'express';
import { storage } from '../storage';
import { authenticate } from '../auth';

const router = Router();

// Get user statistics for smart recommendations
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user creation date
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate account age
    const accountCreatedAt = new Date(user.createdAt || Date.now());
    const accountAgeInDays = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Get post statistics
    const posts = await storage.getPostsByUser(userId);
    const postTypeBreakdown = {
      list: posts.filter(p => p.postType === 'list').length,
      moment: posts.filter(p => p.postType === 'moment').length,
      dish: posts.filter(p => p.postType === 'dish').length,
    };

    // Get last post type
    const lastPost = posts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    // Get circle count
    const circles = await storage.getCirclesByUser(userId);

    const stats = {
      totalPosts: posts.length,
      postTypeBreakdown,
      lastPostType: lastPost?.postType || null,
      accountAgeInDays,
      circleCount: circles.length,
      recentActivity: {
        postsLastWeek: posts.filter(p => {
          const postDate = new Date(p.createdAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return postDate > weekAgo;
        }).length,
        postsLastMonth: posts.filter(p => {
          const postDate = new Date(p.createdAt);
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return postDate > monthAgo;
        }).length,
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

export default router;