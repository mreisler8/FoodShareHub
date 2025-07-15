
import { Router } from 'express';
import { authenticate } from '../auth';
import { db } from '../db';

const router = Router();

// Basic search analytics endpoint (foundation for future enhancement)
router.post('/track', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { query, resultType, resultId, clicked } = req.body;
    
    if (!userId || !query) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // For now, just log the analytics (can be enhanced with proper table later)
    console.log('Search Analytics:', {
      userId,
      query,
      resultType,
      resultId,
      clicked,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ error: 'Failed to track search' });
  }
});

export default router;

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

// Get personalized search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.isAuthenticated() ? req.user!.id : null;
    
    // Get user's recent searches
    const recentSearches = userId ? await storage.getUserRecentSearches(userId, 10) : [];
    
    // Get trending searches
    const trending = await storage.getTrendingSearches(5, '24h');
    
    // Get personalized suggestions based on user's interests
    const personalized = userId ? await storage.getPersonalizedSuggestions(userId, 5) : [];
    
    res.json({
      recent: recentSearches,
      trending: trending,
      personalized: personalized,
      popular: [
        'pizza', 'sushi', 'brunch', 'date night', 'late night',
        'healthy options', 'family friendly', 'takeout'
      ]
    });
  } catch (error: any) {
    console.error('Error getting search suggestions:', error);
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