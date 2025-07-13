import { Router } from 'express';
import { storage } from '../storage.js';
import { z } from 'zod';

const router = Router();

// Track search analytics
router.post('/track', async (req, res) => {
  try {
    const trackingSchema = z.object({
      query: z.string().min(1),
      category: z.string().optional().default('all'),
      resultCount: z.number().optional().default(0),
      clicked: z.boolean().optional().default(false),
      clickedResultId: z.string().optional(),
      clickedResultType: z.string().optional()
    });

    const data = trackingSchema.parse(req.body);
    
    const userId = req.isAuthenticated() ? req.user!.id : null;
    
    const analytics = await storage.trackSearchAnalytics({
      ...data,
      userId,
      timestamp: new Date()
    });

    res.json(analytics);
  } catch (error: any) {
    console.error('Error tracking search analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trending searches
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const timeframe = req.query.timeframe as string || '7d';
    
    const trending = await storage.getTrendingSearches(limit, timeframe);
    res.json(trending);
  } catch (error: any) {
    console.error('Error getting trending searches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent searches for authenticated user
router.get('/recent', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const recent = await storage.getUserRecentSearches(req.user!.id, limit);
    res.json(recent);
  } catch (error: any) {
    console.error('Error getting recent searches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (!query || query.length === 0) {
      return res.json([]);
    }
    
    const suggestions = await storage.getSearchSuggestions(query, limit);
    res.json(suggestions);
  } catch (error: any) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get popular searches by category
router.get('/popular/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const popular = await storage.getPopularSearchesByCategory(category, limit);
    res.json(popular);
  } catch (error: any) {
    console.error('Error getting popular searches by category:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;