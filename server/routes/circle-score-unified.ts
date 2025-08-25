import { Router } from 'express';
import { db } from '../db';
import { ratings, circleMembers, follows } from '../../shared/schema';
import { eq, and, inArray, sql, avg } from 'drizzle-orm';
import { authenticate } from '../auth';
import { resolveRestaurantId } from '../services/restaurantIdentity';

const router = Router();

interface CircleScoreResponse {
  score: number;
  ratingsCount: number;
  updatedAt: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * UNIFIED CIRCLE SCORE ENDPOINT
 * Single source of truth for restaurant circle scores
 * GET /api/restaurant/:restaurantId/circle-score
 */
router.get('/:restaurantId/circle-score', authenticate, async (req: any, res) => {
  try {
    const restaurantIdParam = parseInt(req.params.restaurantId);
    const userId = req.user!.id;

    console.log('CIRCLE_SCORE_UNIFIED:', { restaurantIdParam, userId });

    // Step 1: Resolve canonical restaurant ID
    const resolved = await resolveRestaurantId({ 
      restaurantId: restaurantIdParam 
    });
    const canonicalRestaurantId = resolved.restaurantId;

    console.log('CIRCLE_SCORE_CANONICAL:', { canonicalRestaurantId });

    // Step 2: Get user's network (circles + follows)
    const [userCircles, userFollows] = await Promise.all([
      // Get circles the user is a member of
      db.select({ circleId: circleMembers.circleId })
        .from(circleMembers)
        .where(eq(circleMembers.userId, userId)),
      
      // Get users the current user follows
      db.select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId))
    ]);

    const circleIds = userCircles.map(c => c.circleId);
    const followingIds = userFollows.map(f => f.followingId);
    
    console.log('USER_NETWORK:', { circleIds: circleIds.length, followingIds: followingIds.length });

    // Step 3: Get ratings from user's network only
    // Exclude test data globally (is_test IS NOT TRUE)
    const networkRatingsQuery = db
      .select({
        ratingValue: ratings.ratingValue,
        userId: ratings.userId,
        createdAt: ratings.createdAt
      })
      .from(ratings)
      .where(
        and(
          eq(ratings.restaurantId, canonicalRestaurantId),
          // TODO: Add test data filtering once isTest field is added to schema
          followingIds.length > 0 
            ? inArray(ratings.userId, followingIds)
            : sql`1=0` // No network = no scores
        )
      );

    const networkRatings = await networkRatingsQuery;

    console.log('NETWORK_RATINGS:', { count: networkRatings.length });

    // Step 4: Calculate circle score
    let score = 0;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    if (networkRatings.length > 0) {
      // Calculate weighted average (all ratings equal weight for MVP)
      const totalScore = networkRatings.reduce((sum, rating) => 
        sum + parseFloat(rating.ratingValue as string), 0);
      score = Math.round((totalScore / networkRatings.length) * 10) / 10;
      
      // Set confidence based on rating count
      if (networkRatings.length >= 5) {
        confidence = 'high';
      } else if (networkRatings.length >= 2) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }
    }

    const response: CircleScoreResponse = {
      score,
      ratingsCount: networkRatings.length,
      updatedAt: new Date().toISOString(),
      confidence
    };

    console.log('CIRCLE_SCORE_RESULT:', response);

    // Step 5: Cache result (Redis integration placeholder)
    // TODO: Add Redis caching with key `circleScore:${canonicalRestaurantId}` TTL 180s

    res.json(response);

  } catch (error) {
    console.error('Circle score unified error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate circle score',
      details: (error as Error).message 
    });
  }
});

export default router;