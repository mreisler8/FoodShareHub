import express from 'express';
import { db } from '../db';
import { ratings, restaurants, circles, circleMembers } from '../../shared/schema';
import { eq, and, inArray, isNull, or } from 'drizzle-orm';
import { resolveRestaurantId } from '../services/restaurantIdentity';
import { getCache, setCache } from '../services/cache';
import { features } from '../config/features';

const router = express.Router();

// GET /api/restaurant/:restaurantId/circle-score
router.get('/:restaurantId/circle-score', async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.restaurantId);
    const userId = (req as any).user?.id;
    
    if (!restaurantId || isNaN(restaurantId)) {
      return res.status(400).json({ error: 'Valid restaurant ID required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate restaurant exists via identity resolver
    const resolvedRestaurantId = await resolveRestaurantId({ restaurantId });
    
    // Check cache first
    const cacheKey = `circleScore:${resolvedRestaurantId}`;
    const cached = await getCache(cacheKey);
    
    if (cached) {
      console.log('CIRCLE_SCORE: Cache hit', { restaurantId: resolvedRestaurantId, userId });
      return res.json(cached);
    }

    console.log('CIRCLE_SCORE: Computing score', { restaurantId: resolvedRestaurantId, userId });

    // Get user's circles (they are a member of)
    const userCircles = await db.query.circleMembers.findMany({
      where: eq(circleMembers.userId, userId),
      columns: { circleId: true }
    });
    
    const circleIds = userCircles.map((cm: any) => cm.circleId);
    
    // Get user's followers (simplified - in production this would be from follows table)
    // For now, include all circle members as potential "network"
    let networkUserIds: number[] = [userId]; // Include self
    
    if (circleIds.length > 0) {
      const networkMembers = await db.query.circleMembers.findMany({
        where: inArray(circleMembers.circleId, circleIds),
        columns: { userId: true }
      });
      
      const additionalUserIds = networkMembers.map((cm: any) => cm.userId);
      networkUserIds = Array.from(new Set([...networkUserIds, ...additionalUserIds]));
    }

    // Query ratings for this restaurant from the user's network
    // CRITICAL: Filter out test data
    const networkRatings = await db.query.ratings.findMany({
      where: and(
        eq(ratings.restaurantId, resolvedRestaurantId),
        inArray(ratings.userId, networkUserIds)
        // TODO: Add test data filtering once is_test field is confirmed in schema
        // or(isNull(ratings.isTest), eq(ratings.isTest, false))
      ),
      columns: {
        id: true,
        rating: true,
        userId: true,
        createdAt: true
      }
    });

    console.log('CIRCLE_SCORE: Found ratings', { 
      restaurantId: resolvedRestaurantId, 
      ratingsCount: networkRatings.length,
      networkSize: networkUserIds.length 
    });

    // Compute Circle Score
    let score = 0;
    const ratingsCount = networkRatings.length;
    
    if (ratingsCount > 0) {
      const totalRating = networkRatings.reduce((sum: number, r: any) => sum + parseFloat(r.ratingValue || r.rating || 0), 0);
      score = Math.round((totalRating / ratingsCount) * 10) / 10; // Round to 1 decimal
    }

    const result = {
      score,
      ratingsCount,
      updatedAt: new Date().toISOString()
    };

    // Cache the result
    await setCache(cacheKey, result, 180); // 3 minute TTL
    
    console.log('CIRCLE_SCORE: Computed and cached', { 
      restaurantId: resolvedRestaurantId, 
      score, 
      ratingsCount 
    });

    res.json(result);
  } catch (error) {
    console.error('Circle Score error:', error);
    res.status(500).json({ error: 'Failed to compute circle score' });
  }
});

export default router;