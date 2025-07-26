import { Router } from "express";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { db } from "../db";
import { 
  acceptedRecommendations, 
  restaurants, 
  users, 
  restaurantLists,
  ratings,
  posts,
  insertAcceptedRecommendationSchema 
} from "../../shared/schema";
import { authenticate } from "../auth";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiting: max 10 accepts per minute per user
const acceptRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Too many acceptance requests. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/recommendations/accept - Record recommendation acceptance
router.post("/accept", authenticate, acceptRateLimit, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validationResult = insertAcceptedRecommendationSchema.safeParse({
      ...req.body,
      actorUserId: userId,
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data",
        details: validationResult.error.errors 
      });
    }

    const data = validationResult.data;

    // Validate entity type
    if (!['list', 'rating', 'post'].includes(data.entityType)) {
      return res.status(400).json({ error: "Invalid entity type" });
    }

    // Validate rating value if provided
    if (data.ratingValue && (data.ratingValue < 1 || data.ratingValue > 5)) {
      return res.status(400).json({ error: "Rating value must be between 1 and 5" });
    }

    // Check if user is trying to accept their own recommendation
    if (data.actorUserId === data.recommenderUserId) {
      return res.status(400).json({ error: "Cannot accept your own recommendation" });
    }

    // Verify the entity exists based on type
    let entityExists = false;
    switch (data.entityType) {
      case 'list':
        const listCheck = await db.select().from(restaurantLists).where(eq(restaurantLists.id, data.entityId)).limit(1);
        entityExists = listCheck.length > 0;
        break;
      case 'rating':
        const ratingCheck = await db.select().from(ratings).where(eq(ratings.id, data.entityId)).limit(1);
        entityExists = ratingCheck.length > 0;
        break;
      case 'post':
        const postCheck = await db.select().from(posts).where(eq(posts.id, data.entityId)).limit(1);
        entityExists = postCheck.length > 0;
        break;
    }

    if (!entityExists) {
      return res.status(404).json({ error: "Referenced entity not found" });
    }

    // Verify restaurant exists
    const restaurantCheck = await db.select().from(restaurants).where(eq(restaurants.id, data.restaurantId)).limit(1);
    if (restaurantCheck.length === 0) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    // Verify recommender user exists
    const recommenderCheck = await db.select().from(users).where(eq(users.id, data.recommenderUserId)).limit(1);
    if (recommenderCheck.length === 0) {
      return res.status(404).json({ error: "Recommender not found" });
    }

    // Check for existing acceptance to prevent duplicates
    const existingAcceptance = await db
      .select()
      .from(acceptedRecommendations)
      .where(
        and(
          eq(acceptedRecommendations.actorUserId, data.actorUserId),
          eq(acceptedRecommendations.entityType, data.entityType),
          eq(acceptedRecommendations.entityId, data.entityId),
          eq(acceptedRecommendations.restaurantId, data.restaurantId)
        )
      )
      .limit(1);

    if (existingAcceptance.length > 0) {
      return res.status(409).json({ 
        error: "Recommendation already accepted",
        acceptedAt: existingAcceptance[0].createdAt 
      });
    }

    // Insert the acceptance record
    const [newAcceptance] = await db
      .insert(acceptedRecommendations)
      .values(data)
      .returning();

    res.status(201).json({
      success: true,
      message: "Recommendation accepted successfully",
      acceptance: newAcceptance
    });

  } catch (error) {
    console.error("Error accepting recommendation:", error);
    res.status(500).json({ error: "Failed to accept recommendation" });
  }
});

// GET /api/recommendations/accepted/:userId - User's accepted recommendations
router.get("/accepted/:userId", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUserId = req.user?.id;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Users can only view their own accepted recommendations unless they're viewing public data
    if (userId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const acceptedRecs = await db
      .select({
        id: acceptedRecommendations.id,
        entityType: acceptedRecommendations.entityType,
        entityId: acceptedRecommendations.entityId,
        sourceContext: acceptedRecommendations.sourceContext,
        ratingValue: acceptedRecommendations.ratingValue,
        notes: acceptedRecommendations.notes,
        createdAt: acceptedRecommendations.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          cuisine: restaurants.cuisine,
        },
        recommender: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        }
      })
      .from(acceptedRecommendations)
      .leftJoin(restaurants, eq(acceptedRecommendations.restaurantId, restaurants.id))
      .leftJoin(users, eq(acceptedRecommendations.recommenderUserId, users.id))
      .where(eq(acceptedRecommendations.actorUserId, userId))
      .orderBy(desc(acceptedRecommendations.createdAt))
      .limit(50);

    res.json(acceptedRecs);

  } catch (error) {
    console.error("Error fetching accepted recommendations:", error);
    res.status(500).json({ error: "Failed to fetch accepted recommendations" });
  }
});

// GET /api/recommendations/impact/:userId - Recommender's influence stats
router.get("/impact/:userId", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get overall impact stats
    const [impactStats] = await db
      .select({
        totalAcceptances: count(acceptedRecommendations.id),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${acceptedRecommendations.actorUserId})`,
        averageRating: sql<number>`AVG(${acceptedRecommendations.ratingValue})`,
      })
      .from(acceptedRecommendations)
      .where(eq(acceptedRecommendations.recommenderUserId, userId));

    // Get recent acceptances with details
    const recentAcceptances = await db
      .select({
        id: acceptedRecommendations.id,
        entityType: acceptedRecommendations.entityType,
        entityId: acceptedRecommendations.entityId,
        sourceContext: acceptedRecommendations.sourceContext,
        ratingValue: acceptedRecommendations.ratingValue,
        createdAt: acceptedRecommendations.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
        },
        actor: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        }
      })
      .from(acceptedRecommendations)
      .leftJoin(restaurants, eq(acceptedRecommendations.restaurantId, restaurants.id))
      .leftJoin(users, eq(acceptedRecommendations.actorUserId, users.id))
      .where(eq(acceptedRecommendations.recommenderUserId, userId))
      .orderBy(desc(acceptedRecommendations.createdAt))
      .limit(20);

    // Get breakdown by entity type
    const entityTypeBreakdown = await db
      .select({
        entityType: acceptedRecommendations.entityType,
        count: count(acceptedRecommendations.id),
      })
      .from(acceptedRecommendations)
      .where(eq(acceptedRecommendations.recommenderUserId, userId))
      .groupBy(acceptedRecommendations.entityType);

    res.json({
      summary: {
        totalAcceptances: impactStats.totalAcceptances || 0,
        uniqueUsers: impactStats.uniqueUsers || 0,
        averageRating: impactStats.averageRating || null,
      },
      recentAcceptances,
      breakdown: entityTypeBreakdown,
    });

  } catch (error) {
    console.error("Error fetching impact stats:", error);
    res.status(500).json({ error: "Failed to fetch impact stats" });
  }
});

// GET /api/recommendations/stats/:entityType/:entityId - Get acceptance count for content
router.get("/stats/:entityType/:entityId", authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const entityIdNum = parseInt(entityId);

    if (!entityType || !entityId || isNaN(entityIdNum)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    if (!['list', 'rating', 'post'].includes(entityType)) {
      return res.status(400).json({ error: "Invalid entity type" });
    }

    // Get acceptance stats for this specific content
    const [stats] = await db
      .select({
        totalAcceptances: count(acceptedRecommendations.id),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${acceptedRecommendations.actorUserId})`,
        averageRating: sql<number>`AVG(${acceptedRecommendations.ratingValue})`,
      })
      .from(acceptedRecommendations)
      .where(
        and(
          eq(acceptedRecommendations.entityType, entityType),
          eq(acceptedRecommendations.entityId, entityIdNum)
        )
      );

    // Get recent acceptors (for "Tried by X people" display)
    const recentAcceptors = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
        acceptedAt: acceptedRecommendations.createdAt,
        ratingValue: acceptedRecommendations.ratingValue,
      })
      .from(acceptedRecommendations)
      .leftJoin(users, eq(acceptedRecommendations.actorUserId, users.id))
      .where(
        and(
          eq(acceptedRecommendations.entityType, entityType),
          eq(acceptedRecommendations.entityId, entityIdNum)
        )
      )
      .orderBy(desc(acceptedRecommendations.createdAt))
      .limit(10);

    res.json({
      stats: {
        totalAcceptances: stats.totalAcceptances || 0,
        uniqueUsers: stats.uniqueUsers || 0,
        averageRating: stats.averageRating || null,
      },
      recentAcceptors,
    });

  } catch (error) {
    console.error("Error fetching entity stats:", error);
    res.status(500).json({ error: "Failed to fetch entity stats" });
  }
});

export default router;