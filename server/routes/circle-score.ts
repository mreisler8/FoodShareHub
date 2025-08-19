
import { Router } from "express";
import { authenticate } from "../auth";
import { db } from "../db";
import { ratings, users, circleMembers } from "../../shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

const router = Router();

// Get circle score by Google Place ID
router.get("/:identifier", authenticate, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query;
    const userId = req.user!.id;

    // Get user's circle memberships
    const userCircles = await db
      .select({ circleId: circleMembers.circleId })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));

    const circleIds = userCircles.map(c => c.circleId);

    if (circleIds.length === 0) {
      return res.json({
        score: null,
        reviewCount: 0,
        message: 'Join circles to see trust-based scores'
      });
    }

    let circleRatings;

    if (type === 'google_place') {
      // Query by Google Place ID
      circleRatings = await db
        .select({
          ratingValue: ratings.ratingValue,
          userId: ratings.userId,
          userName: users.name
        })
        .from(ratings)
        .innerJoin(users, eq(ratings.userId, users.id))
        .innerJoin(circleMembers, eq(users.id, circleMembers.userId))
        .where(and(
          eq(ratings.googlePlaceId, identifier),
          inArray(circleMembers.circleId, circleIds),
          eq(ratings.isPrivate, false)
        ));
    } else {
      // Legacy: Query by database ID
      const restaurantId = parseInt(identifier);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ error: 'Invalid restaurant ID' });
      }

      circleRatings = await db
        .select({
          ratingValue: ratings.ratingValue,
          userId: ratings.userId,
          userName: users.name
        })
        .from(ratings)
        .innerJoin(users, eq(ratings.userId, users.id))
        .innerJoin(circleMembers, eq(users.id, circleMembers.userId))
        .where(and(
          eq(ratings.restaurantId, restaurantId),
          inArray(circleMembers.circleId, circleIds),
          eq(ratings.isPrivate, false)
        ));
    }

    if (circleRatings.length === 0) {
      return res.json({
        score: null,
        reviewCount: 0,
        message: 'No ratings from your circles yet'
      });
    }

    // Calculate weighted average
    const totalRating = circleRatings.reduce((sum, rating) => {
      return sum + parseFloat(rating.ratingValue);
    }, 0);

    const averageScore = totalRating / circleRatings.length;

    res.json({
      score: Math.round(averageScore * 10) / 10,
      reviewCount: circleRatings.length,
      contributors: circleRatings.map(r => ({
        userId: r.userId,
        name: r.userName,
        rating: parseFloat(r.ratingValue)
      }))
    });

  } catch (error) {
    console.error('Error calculating circle score:', error);
    res.status(500).json({ error: 'Failed to calculate circle score' });
  }
});

export default router;
