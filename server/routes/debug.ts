import { Router } from 'express';
import { db } from '../db';
import { restaurants, ratings, restaurantLists } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { resolveRestaurantId } from '../services/restaurantIdentity';
import { authenticate } from '../auth';

const router = Router();

interface RestaurantSnapshot {
  resolved: {
    restaurantId?: number;
    placeId?: string;
  };
  dbRow: any;
  userRatingByRestaurantId: any;
  userRatingByPlaceId: any;
  circleScore: any;
  featuredLists: {
    source: string;
    count: number;
  };
  testDataPresent: {
    ratings: number;
    details: any[];
  };
}

/**
 * DEBUG ENDPOINT: Restaurant Data Snapshot
 * Read-only aggregation of all restaurant data sources
 * GET /api/_debug/restaurant-snapshot?restaurantId=<id>&placeId=<pid>
 */
router.get('/restaurant-snapshot', authenticate, async (req: any, res) => {
  try {
    const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId) : undefined;
    const placeId = req.query.placeId as string;
    const userId = req.user!.id;

    console.log('DEBUG_SNAPSHOT:', { restaurantId, placeId, userId });

    // Step 1: Resolve canonical identity  
    const resolved = await resolveRestaurantId({
      restaurantId,
      placeId
    });

    console.log('DEBUG_RESOLVED:', resolved);

    // Step 2: Get database row
    let dbRow = null;
    if (resolved.restaurantId) {
      const rows = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, resolved.restaurantId))
        .limit(1);
      dbRow = rows[0] || null;
    }

    // Step 3: Get user rating by restaurant ID
    let userRatingByRestaurantId = null;
    if (resolved.restaurantId) {
      const ratingRows = await db
        .select()
        .from(ratings)
        .where(
          and(
            eq(ratings.userId, userId),
            eq(ratings.restaurantId, resolved.restaurantId)
          )
        )
        .limit(1);
      userRatingByRestaurantId = ratingRows[0] || null;
    }

    // Step 4: Get user rating by place ID (potential contamination source)
    let userRatingByPlaceId = null;
    if (resolved.placeId) {
      const ratingRows = await db
        .select()
        .from(ratings)
        .where(
          and(
            eq(ratings.userId, userId),
            eq(ratings.googlePlaceId, resolved.placeId)
          )
        )
        .limit(1);
      userRatingByPlaceId = ratingRows[0] || null;
    }

    // Step 5: Get Circle Score (simplified for debug)
    let circleScore = null;
    if (resolved.restaurantId) {
      try {
        // Simple circle score calculation for debug purposes
        const ratingsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(ratings)
          .where(eq(ratings.restaurantId, resolved.restaurantId));
        
        circleScore = {
          score: 0, // Placeholder
          ratingsCount: ratingsCount[0]?.count || 0
        };
      } catch (err) {
        console.error('Circle Score fetch failed:', err);
        circleScore = { error: (err as Error).message };
      }
    }

    // Step 6: Check featured lists source
    let featuredLists = { source: 'unknown', count: 0 };
    if (resolved.restaurantId) {
      try {
        const listRows = await db
          .select({ count: sql<number>`count(*)` })
          .from(restaurantLists)
          .where(eq(restaurantLists.id, resolved.restaurantId)); // Using id instead of restaurantId
        
        featuredLists = {
          source: '/api/restaurant-lists', // Real endpoint
          count: listRows[0]?.count || 0
        };
      } catch (err) {
        featuredLists = { source: 'mock/error', count: 0 };
      }
    }

    // Step 7: Detect test data contamination (simplified - look for Villa di Roma mentions)
    const testDataQuery = await db
      .select({
        id: ratings.id,
        note: ratings.note,
        restaurantName: ratings.restaurantName
      })
      .from(ratings)
      .where(
        and(
          resolved.restaurantId ? eq(ratings.restaurantId, resolved.restaurantId) : sql`1=0`,
          sql`${ratings.note} LIKE '%Villa di Roma%'` // Look for contamination pattern
        )
      );

    const testDataPresent = {
      ratings: testDataQuery.length,
      details: testDataQuery
    };

    const snapshot: RestaurantSnapshot = {
      resolved,
      dbRow,
      userRatingByRestaurantId,
      userRatingByPlaceId,
      circleScore,
      featuredLists,
      testDataPresent
    };

    console.log('DEBUG_SNAPSHOT_RESULT:', JSON.stringify(snapshot, null, 2));

    res.json(snapshot);

  } catch (error) {
    console.error('Debug snapshot error:', error);
    res.status(500).json({ 
      error: 'Debug snapshot failed',
      details: (error as Error).message 
    });
  }
});

/**
 * DEBUG ENDPOINT: Recent Forensics Traces
 * GET /api/_debug/forensics-traces?limit=50
 */
router.get('/forensics-traces', async (req, res) => {
  try {
    const { getForensicsTraces } = await import('../middleware/forensicsTracing');
    const limit = parseInt(req.query.limit as string) || 50;
    const traces = await getForensicsTraces(limit);
    
    res.json({
      traces,
      count: traces.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Forensics traces error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch forensics traces',
      details: (error as Error).message 
    });
  }
});

export default router;