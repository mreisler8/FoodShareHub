import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { sendError } from "./utils/sendError";

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
      sendError(res, 400, "Invalid analytics data");
    }
  });

  // Get user's activity history
  app.get("/api/analytics/user/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return sendError(res, 401, "Unauthorized");
    }
    
    try {
      const userId = parseInt(req.params.userId);
      
      // Only allow users to view their own analytics
      if (req.user?.id !== userId) {
        return sendError(res, 403, "Forbidden");
      }
      
      const actions = await storage.getActionsByUser(userId);
      res.status(200).json(actions);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      sendError(res, 500, "Failed to fetch analytics");
    }
  });

  // Get popular content
  app.get("/api/analytics/popular", async (_req: Request, res: Response) => {
    try {
      const popularContent = await storage.getPopularContent();
      res.status(200).json(popularContent);
    } catch (error) {
      console.error("Error fetching popular content:", error);
      sendError(res, 500, "Failed to fetch popular content");
    }
  });
}
