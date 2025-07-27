import { db } from '../db';
import { ratings, restaurantListItems, circles, circleMembers, userFollowers, users, restaurantLists } from '@shared/schema';
import { and, eq, or, inArray, desc, gte, sql, count } from 'drizzle-orm';

// Cache management for performance optimization
const circleScoreCache = new Map<string, { data: CircleScoreResult | null; calculatedAt: Date }>();

// Circuit Breaker for error handling
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 30000 // 30 seconds
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T | null> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime < this.timeout) {
        return null; // Fast fail
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

const circuitBreaker = new CircuitBreaker();

export interface CircleScoreResult {
  score: number; // 0-100
  confidence: "low" | "moderate" | "high";
  contributors: Array<{
    userId: number;
    username: string;
    name: string;
    actionType: 'rating' | 'list_placement' | 'reaction' | 'save';
    value: number;
    recency: number; // days ago
  }>;
  totalContributors: number;
  breakdown: {
    quickRatings: number;
    listPlacements: number;
    reactions: number;
    saves: number;
  };
}

interface TrustedUser {
  id: number;
  username: string;
  name: string;
  relationshipType: 'circle' | 'follow';
}

export async function calculateCircleScore(
  restaurantId: number | null,
  googlePlaceId: string | null,
  requestingUserId: number
): Promise<CircleScoreResult | null> {
  // Check cache first
  const cacheKey = `${restaurantId || 'null'}-${googlePlaceId || 'null'}-${requestingUserId}`;
  const cached = circleScoreCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.calculatedAt.getTime()) < 5 * 60 * 1000) { // 5 minute cache
    return cached.data;
  }
  
  try {
    // 1. Get trusted users (circle members + followed users)
    const trustedUsers = await getTrustedUsers(requestingUserId);
    const trustedUserIds = trustedUsers.map(u => u.id);
    
    // 2. Fetch Quick Ratings from trusted users + requesting user
    const quickRatings = await getQuickRatings(restaurantId, googlePlaceId, trustedUserIds, requestingUserId);
    
    // 3. Fetch List Placements from shared lists in circles
    const listPlacements = await getListPlacements(restaurantId, googlePlaceId, requestingUserId);
    
    // 4. Calculate raw score with weights and recency decay
    let totalScore = 0;
    let contributors: CircleScoreResult['contributors'] = [];
    
    // Process Quick Ratings (weight: 3)
    quickRatings.forEach(rating => {
      // Check if this is the requesting user or a trusted user
      let user;
      if (rating.userId === requestingUserId) {
        // Add requesting user details for their own rating
        user = { id: requestingUserId, username: 'You', name: 'You' };
      } else {
        user = trustedUsers.find(u => u.id === rating.userId);
        if (!user) return;
      }
      
      const recencyDays = Math.floor((Date.now() - new Date(rating.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const recencyDecay = calculateRecencyDecay(recencyDays);
      const weightedScore = rating.ratingValue * 3 * recencyDecay;
      
      totalScore += weightedScore;
      contributors.push({
        userId: user.id,
        username: user.username,
        name: user.name,
        actionType: 'rating',
        value: rating.ratingValue,
        recency: recencyDays
      });
    });
    
    // Process List Placements (weight: varies by position)
    listPlacements.forEach(placement => {
      const user = trustedUsers.find(u => u.id === placement.userId);
      if (!user) return;
      
      const recencyDays = Math.floor((Date.now() - new Date(placement.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const recencyDecay = calculateRecencyDecay(recencyDays);
      
      // Higher positions get higher weight (1st = 5 points, 2nd = 4, etc.)
      const positionWeight = Math.max(6 - (placement.position || 5), 1);
      const weightedScore = positionWeight * recencyDecay;
      
      totalScore += weightedScore;
      contributors.push({
        userId: user.id,
        username: user.username,
        name: user.name,
        actionType: 'list_placement',
        value: placement.position || 0,
        recency: recencyDays
      });
    });
    
    if (contributors.length === 0) {
      return null; // No data from trusted sources or user
    }
    
    // 5. Apply confidence modifier and normalize to 0-100
    const confidence = calculateConfidence(contributors);
    const confidenceModifier = confidence === 'high' ? 1.1 : confidence === 'moderate' ? 1.0 : 0.9;
    
    const normalizedScore = Math.min(100, Math.max(0, (totalScore / contributors.length) * confidenceModifier));
    
    // 6. Create breakdown
    const breakdown = {
      quickRatings: quickRatings.length,
      listPlacements: listPlacements.length,
      reactions: 0, // TODO: Implement when reactions are available
      saves: 0 // TODO: Implement when saves are available
    };
    
    const circleScoreResult = {
      score: Math.round(normalizedScore),
      confidence,
      contributors: contributors.sort((a, b) => a.recency - b.recency), // Most recent first
      totalContributors: contributors.length,
      breakdown
    };
    
    // Cache the result  
    circleScoreCache.set(cacheKey, { data: circleScoreResult, calculatedAt: new Date() });
    
    // Trigger pre-calculation for popular restaurants
    scorePreCalculator.preCalculateForPopularRestaurants(restaurantId, googlePlaceId);
    
    return circleScoreResult;
    
  } catch (error) {
    console.error('Circle score calculation error:', error);
    // Cache null result to prevent repeated failed calculations
    circleScoreCache.set(cacheKey, { data: null, calculatedAt: new Date() });
    return null;
  }
}

async function getTrustedUsers(requestingUserId: number): Promise<TrustedUser[]> {
  const trustedUsers: TrustedUser[] = [];
  
  // Get users from circles - simplified approach
  
  // Get all users from circles where requesting user is a member
  const userCircleIds = await db
    .select({ circleId: circleMembers.circleId })
    .from(circleMembers)
    .where(and(
      eq(circleMembers.userId, requestingUserId),
      eq(circleMembers.status, 'active')
    ));
  
  if (userCircleIds.length > 0) {
    const circleUsersList = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name
      })
      .from(users)
      .innerJoin(circleMembers, eq(circleMembers.userId, users.id))
      .where(and(
        inArray(circleMembers.circleId, userCircleIds.map(c => c.circleId)),
        eq(circleMembers.status, 'active'),
        sql`${users.id} != ${requestingUserId}` // Don't include self
      ));
    
    circleUsersList.forEach(user => {
      trustedUsers.push({
        ...user,
        relationshipType: 'circle'
      });
    });
  }
  
  // Get users that the requesting user follows
  const followedUsers = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name
    })
    .from(users)
    .innerJoin(userFollowers, eq(userFollowers.followingId, users.id))
    .where(and(
      eq(userFollowers.followerId, requestingUserId),
      eq(userFollowers.status, 'active')
    ));
  
  followedUsers.forEach(user => {
    // Don't duplicate if already in circles
    if (!trustedUsers.some(tu => tu.id === user.id)) {
      trustedUsers.push({
        ...user,
        relationshipType: 'follow'
      });
    }
  });
  
  return trustedUsers;
}

async function getQuickRatings(
  restaurantId: number | null,
  googlePlaceId: string | null,
  trustedUserIds: number[],
  requestingUserId: number
) {
  // Include both trusted users AND the requesting user
  const allUserIds = [...trustedUserIds, requestingUserId];
  
  const whereConditions = [
    inArray(ratings.userId, allUserIds),
    // For the requesting user, include all their ratings (private or shared)
    // For trusted users, only include shared ratings
    or(
      eq(ratings.userId, requestingUserId), // User's own ratings (any privacy level)
      and(
        inArray(ratings.userId, trustedUserIds),
        eq(ratings.sharedWithCircle, true) // Trusted users' shared ratings only
      )
    )
  ];
  
  if (restaurantId) {
    whereConditions.push(eq(ratings.restaurantId, restaurantId));
  } else if (googlePlaceId) {
    whereConditions.push(eq(ratings.googlePlaceId, googlePlaceId));
  } else {
    return []; // No valid identifier
  }
  
  return await db
    .select({
      userId: ratings.userId,
      ratingValue: ratings.ratingValue,
      createdAt: ratings.createdAt
    })
    .from(ratings)
    .where(and(...whereConditions))
    .orderBy(desc(ratings.createdAt));
}

async function getListPlacements(
  restaurantId: number | null,
  googlePlaceId: string | null,
  requestingUserId: number
) {
  // Get lists shared with circles where the requesting user is a member
  const userCircleIds = await db
    .select({ circleId: circleMembers.circleId })
    .from(circleMembers)
    .where(and(
      eq(circleMembers.userId, requestingUserId),
      eq(circleMembers.status, 'active')
    ));
  
  if (userCircleIds.length === 0) {
    return [];
  }
  
  const whereConditions = [];
  
  if (restaurantId) {
    whereConditions.push(eq(restaurantListItems.restaurantId, restaurantId));
  } else if (googlePlaceId) {
    // Note: assuming googlePlaceId field exists or will be added to restaurantListItems
    // For now, skip this condition as schema may not have googlePlaceId yet
    return [];
  } else {
    return [];
  }
  
  // Get restaurant placements from lists shared with user's circles
  return await db
    .select({
      userId: restaurantLists.createdById,
      position: restaurantListItems.position,
      createdAt: restaurantListItems.addedAt // Using addedAt as it exists in schema
    })
    .from(restaurantListItems)
    .innerJoin(restaurantLists, eq(restaurantListItems.listId, restaurantLists.id))
    .where(and(
      ...whereConditions,
      eq(restaurantLists.shareWithCircle, true),
      inArray(restaurantLists.circleId, userCircleIds.map(c => c.circleId))
    ))
    .orderBy(desc(restaurantListItems.addedAt));
}

function calculateRecencyDecay(days: number): number {
  // Exponential decay: 1.0 for today, 0.9 after 30 days, 0.7 after 90 days, 0.5 after 180 days
  if (days <= 30) return 1.0;
  if (days <= 90) return 0.9;
  if (days <= 180) return 0.7;
  return 0.5;
}

function calculateConfidence(contributors: CircleScoreResult['contributors']): "low" | "moderate" | "high" {
  const recentContributors = contributors.filter(c => c.recency <= 30).length;
  const moderateContributors = contributors.filter(c => c.recency <= 90).length;
  const totalContributors = contributors.length;
  
  // High confidence: >= 5 trusted sources within 30 days
  if (recentContributors >= 5) return 'high';
  
  // Moderate confidence: >= 3 trusted sources within 90 days
  if (moderateContributors >= 3) return 'moderate';
  
  // Low confidence: >= 1 trusted source within 180 days
  if (totalContributors >= 1) return 'low';
  
  return 'low';
}

// Circle Score Cache Management Class
class CircleScorePreCalculator {
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startCleanupTimer();
  }
  
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, this.CACHE_CLEANUP_INTERVAL);
  }
  
  private cleanupCache(): void {
    if (circleScoreCache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest entries (LRU-style cleanup)
      const entries = Array.from(circleScoreCache.entries());
      entries.sort((a, b) => a[1].calculatedAt.getTime() - b[1].calculatedAt.getTime());
      
      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2));
      toRemove.forEach(([key]) => circleScoreCache.delete(key));
      
      console.log(`Cache cleanup: Removed ${toRemove.length} entries, ${circleScoreCache.size} remaining`);
    }
  }
  
  // Optimized popularity check with combined query
  async isPopularRestaurant(restaurantId: number | null, googlePlaceId: string | null): Promise<boolean> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Single query with multiple counts
      const popularityQuery = db
        .select({
          recentRatings: sql<number>`count(distinct ${ratings.id})`.as('recentRatings'),
          listPlacements: sql<number>`count(distinct ${restaurantListItems.id})`.as('listPlacements')
        })
        .from(ratings)
        .leftJoin(restaurantListItems, 
          restaurantId 
            ? eq(restaurantListItems.restaurantId, restaurantId)
            : sql`1=0` // Skip googlePlaceId for now as it's not in schema
        )
        .where(
          and(
            restaurantId
              ? eq(ratings.restaurantId, restaurantId)
              : eq(ratings.googlePlaceId, googlePlaceId!),
            gte(ratings.createdAt, thirtyDaysAgo)
          )
        );
      
      const [popularityMetrics] = await popularityQuery;
      
      if (!popularityMetrics) return false;
      
      return (popularityMetrics.recentRatings > 10) || (popularityMetrics.listPlacements > 5);
    } catch (error) {
      console.error('Error checking restaurant popularity:', error);
      return false;
    }
  }
  
  // Batch processing with circuit breaker
  async preCalculateForPopularRestaurants(restaurantId: number | null, googlePlaceId: string | null): Promise<void> {
    try {
      const isPopular = await this.isPopularRestaurant(restaurantId, googlePlaceId);
      if (!isPopular) return;
      
      const activeUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`1=1`) // Temporarily remove date filter until lastLoginAt is added to schema
        .limit(50);
      
      // Batch process in chunks of 10 to avoid overwhelming the system
      const BATCH_SIZE = 10;
      for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
        const batch = activeUsers.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(user => this.preCalculateForUser(restaurantId, googlePlaceId, user.id))
        );
        
        // Small delay between batches to prevent resource exhaustion
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error pre-calculating popular restaurant scores:', error);
    }
  }
  
  private async preCalculateForUser(restaurantId: number | null, googlePlaceId: string | null, userId: number): Promise<void> {
    await circuitBreaker.execute(async () => {
      return calculateCircleScore(restaurantId, googlePlaceId, userId);
    });
  }
  
  // Cleanup on shutdown
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

const scorePreCalculator = new CircleScorePreCalculator();