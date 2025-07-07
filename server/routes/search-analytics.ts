import { Router, Request, Response } from "express";
import { authenticate } from "../auth.js";
import { storage } from "../storage.js";
import { z } from "zod";

const router = Router();

// Schema for search analytics
const searchAnalyticsSchema = z.object({
  query: z.string().min(1).max(100),
  category: z.enum(['restaurant', 'list', 'post', 'user', 'all']).optional(),
  resultCount: z.number().min(0).optional(),
  clicked: z.boolean().optional(),
  clickedResultId: z.string().optional(),
  clickedResultType: z.enum(['restaurant', 'list', 'post', 'user']).optional()
});

// Track search query
router.post("/track", authenticate, async (req: Request, res: Response) => {
  try {
    const data = searchAnalyticsSchema.parse(req.body);
    const userId = req.user?.id;

    // Store search analytics
    await storage.trackSearchAnalytics({
      userId: userId || null,
      query: data.query,
      category: data.category || 'all',
      resultCount: data.resultCount || 0,
      clicked: data.clicked || false,
      clickedResultId: data.clickedResultId || null,
      clickedResultType: data.clickedResultType || null,
      timestamp: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Search analytics error:", error);
    res.status(400).json({ error: "Invalid search analytics data" });
  }
});

// Get trending searches
router.get("/trending", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const timeframe = req.query.timeframe as string || '7d'; // 7d, 30d, all

    const trending = await storage.getTrendingSearches(limit, timeframe);
    res.json(trending);
  } catch (error) {
    console.error("Get trending searches error:", error);
    res.status(500).json({ error: "Failed to get trending searches" });
  }
});

// Get popular queries by category
router.get("/popular/:category", async (req: Request, res: Response) => {
  try {
    const category = req.params.category;
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (!['restaurant', 'list', 'post', 'user', 'all'].includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const popular = await storage.getPopularSearchesByCategory(category, limit);
    res.json(popular);
  } catch (error) {
    console.error("Get popular searches error:", error);
    res.status(500).json({ error: "Failed to get popular searches" });
  }
});

// Get search suggestions
router.get("/suggestions", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const suggestions = await storage.getSearchSuggestions(query, limit);
    res.json(suggestions);
  } catch (error) {
    console.error("Get search suggestions error:", error);
    res.status(500).json({ error: "Failed to get search suggestions" });
  }
});

// Get user's recent searches
router.get("/recent", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.json([]);
    }

    const recent = await storage.getUserRecentSearches(userId, limit);
    res.json(recent);
  } catch (error) {
    console.error("Get recent searches error:", error);
    res.status(500).json({ error: "Failed to get recent searches" });
  }
});

export default router;