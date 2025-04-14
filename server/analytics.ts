import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";

const analyticEventSchema = z.object({
  userId: z.number(),
  action: z.string(),
  metadata: z.record(z.any()).default({})
});

export function setupAnalytics(app: Express) {
  // Track user actions
  app.post("/api/analytics/track", async (req: Request, res: Response) => {
    try {
      const data = analyticEventSchema.parse(req.body);
      
      await storage.logUserAction(
        data.userId,
        data.action,
        data.metadata
      );
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Analytics tracking error:", error);
      res.status(400).json({ error: "Invalid analytics data" });
    }
  });

  // Get user's activity history
  app.get("/api/analytics/user/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      
      // Only allow users to view their own analytics
      if (req.user?.id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const actions = await storage.getActionsByUser(userId);
      res.status(200).json(actions);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get popular content
  app.get("/api/analytics/popular", async (_req: Request, res: Response) => {
    try {
      const popularContent = await storage.getPopularContent();
      res.status(200).json(popularContent);
    } catch (error) {
      console.error("Error fetching popular content:", error);
      res.status(500).json({ error: "Failed to fetch popular content" });
    }
  });
}