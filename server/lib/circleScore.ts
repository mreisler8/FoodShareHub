import { db } from '../db';
import { ratings, restaurantListItems, circles, circleMembers, userFollowers, users, restaurantLists } from '@shared/schema';
import { and, eq, or, inArray, desc, gte } from 'drizzle-orm';

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
  try {
    // 1. Get trusted users (circle members + followed users)
    const trustedUsers = await getTrustedUsers(requestingUserId);
    
    if (trustedUsers.length === 0) {
      return null; // No trusted network
    }

    const trustedUserIds = trustedUsers.map(u => u.id);
    
    // 2. Fetch Quick Ratings from trusted users
    const quickRatings = await getQuickRatings(restaurantId, googlePlaceId, trustedUserIds);
    
    // 3. Fetch List Placements from shared lists in circles
    const listPlacements = await getListPlacements(restaurantId, googlePlaceId, requestingUserId);
    
    // 4. Calculate raw score with weights and recency decay
    let totalScore = 0;
    let contributors: CircleScoreResult['contributors'] = [];
    
    // Process Quick Ratings (weight: 3)
    quickRatings.forEach(rating => {
      const user = trustedUsers.find(u => u.id === rating.userId);
      if (!user) return;
      
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
      return null; // No data from trusted sources
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
    
    return {
      score: Math.round(normalizedScore),
      confidence,
      contributors: contributors.sort((a, b) => a.recency - b.recency), // Most recent first
      totalContributors: contributors.length,
      breakdown
    };
    
  } catch (error) {
    console.error('Circle score calculation error:', error);
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
  trustedUserIds: number[]
) {
  const whereConditions = [
    inArray(ratings.userId, trustedUserIds),
    eq(ratings.sharedWithCircle, true) // Only include shared ratings
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

import { sql } from 'drizzle-orm';