
import { db } from '../db';
import { calculateCircleScore } from './circleScore';
import { ratings, restaurantListItems, users } from '@shared/schema';
import { eq, desc, gte, sql, and } from 'drizzle-orm';

interface CircleScoreCacheEntry {
  restaurantId: number | null;
  googlePlaceId: string | null;
  userId: number;
  score: any; // CircleScoreResult
  calculatedAt: Date;
}

// In-memory cache for quick lookups
const circleScoreCache = new Map<string, CircleScoreCacheEntry>();

export class CircleScorePreCalculator {
  private static instance: CircleScorePreCalculator;
  
  public static getInstance(): CircleScorePreCalculator {
    if (!CircleScorePreCalculator.instance) {
      CircleScorePreCalculator.instance = new CircleScorePreCalculator();
    }
    return CircleScorePreCalculator.instance;
  }

  /**
   * Generate cache key for a restaurant and user combination
   */
  private getCacheKey(restaurantId: number | null, googlePlaceId: string | null, userId: number): string {
    const id = restaurantId ? `r_${restaurantId}` : `g_${googlePlaceId}`;
    return `${id}_u_${userId}`;
  }

  /**
   * Check if a restaurant is "popular" and should be pre-calculated
   */
  async isPopularRestaurant(restaurantId: number | null, googlePlaceId: string | null): Promise<boolean> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Count recent ratings
      const recentRatingsQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(ratings);
      
      if (restaurantId) {
        recentRatingsQuery.where(
          and(
            eq(ratings.restaurantId, restaurantId),
            gte(ratings.createdAt, thirtyDaysAgo)
          )
        );
      } else if (googlePlaceId) {
        recentRatingsQuery.where(
          and(
            eq(ratings.googlePlaceId, googlePlaceId),
            gte(ratings.createdAt, thirtyDaysAgo)
          )
        );
      }
      
      const recentRatings = await recentRatingsQuery;
      const ratingsCount = recentRatings[0]?.count || 0;
      
      // Count list placements
      const listPlacementsQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(restaurantListItems);
        
      if (restaurantId) {
        listPlacementsQuery.where(eq(restaurantListItems.restaurantId, restaurantId));
      } else if (googlePlaceId) {
        // Note: googlePlaceId doesn't exist in restaurantListItems table yet
        // For now, skip this check for Google Place IDs
        listPlacementsQuery.where(sql`1=0`); // Always return 0 count
      }
      
      const listPlacements = await listPlacementsQuery;
      const placementsCount = listPlacements[0]?.count || 0;
      
      // Popular if: >10 ratings in 30 days OR >5 list placements
      return ratingsCount > 10 || placementsCount > 5;
    } catch (error) {
      console.error('Error checking restaurant popularity:', error);
      return false;
    }
  }

  /**
   * Pre-calculate Circle Score for popular restaurants
   */
  async preCalculateForPopularRestaurants(restaurantId: number | null, googlePlaceId: string | null): Promise<void> {
    try {
      const isPopular = await this.isPopularRestaurant(restaurantId, googlePlaceId);
      if (!isPopular) return;

      // Get active users who might view this restaurant (recent activity)
      // Note: lastLoginAt doesn't exist in users table yet, use updatedAt as proxy
      const activeUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(gte(users.updatedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
        .limit(50); // Limit to prevent overwhelming the system

      // Pre-calculate for each active user
      for (const user of activeUsers) {
        await this.preCalculateForUser(restaurantId, googlePlaceId, user.id);
      }
    } catch (error) {
      console.error('Error pre-calculating popular restaurant scores:', error);
    }
  }

  /**
   * Pre-calculate Circle Score for a specific user
   */
  async preCalculateForUser(restaurantId: number | null, googlePlaceId: string | null, userId: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(restaurantId, googlePlaceId, userId);
      
      // Check if already cached recently (within 5 minutes)
      const cached = circleScoreCache.get(cacheKey);
      if (cached && (Date.now() - cached.calculatedAt.getTime()) < 5 * 60 * 1000) {
        return;
      }

      // Calculate fresh score
      const score = await calculateCircleScore(restaurantId, googlePlaceId, userId);
      
      // Cache the result
      circleScoreCache.set(cacheKey, {
        restaurantId,
        googlePlaceId,
        userId,
        score,
        calculatedAt: new Date()
      });

      // Optional: Persist to database cache table for durability
      // You could create a circle_score_cache table for this
      
    } catch (error) {
      console.error('Error pre-calculating Circle Score for user:', error);
    }
  }

  /**
   * Get cached Circle Score if available
   */
  getCachedScore(restaurantId: number | null, googlePlaceId: string | null, userId: number): any | null {
    const cacheKey = this.getCacheKey(restaurantId, googlePlaceId, userId);
    const cached = circleScoreCache.get(cacheKey);
    
    if (!cached) return null;
    
    // Check if cache is still valid (10 minutes)
    const isValid = (Date.now() - cached.calculatedAt.getTime()) < 10 * 60 * 1000;
    
    if (!isValid) {
      circleScoreCache.delete(cacheKey);
      return null;
    }
    
    return cached.score;
  }

  /**
   * Invalidate cache for a restaurant when new data is added
   */
  invalidateRestaurantCache(restaurantId: number | null, googlePlaceId: string | null): void {
    const prefix = restaurantId ? `r_${restaurantId}_` : `g_${googlePlaceId}_`;
    
    for (const [key] of circleScoreCache) {
      if (key.startsWith(prefix)) {
        circleScoreCache.delete(key);
      }
    }
  }
}

export const circleScorePreCalculator = CircleScorePreCalculator.getInstance();
