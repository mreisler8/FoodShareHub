import { Router } from 'express';
import { eq, and, desc, sql, gt, inArray } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { 
  posts, 
  restaurantLists as lists, 
  ratings, 
  restaurants, 
  users, 
  userFollowers,
  circleMembers,
  circles
} from '../../shared/schema';

const router = Router();

interface DiscoverItem {
  id: string;
  type: "list" | "rating" | "post" | "restaurant";
  content: any;
  score: number;
  metadata: {
    author: { id: string; name: string; avatar?: string };
    createdAt: string;
    socialProof?: string;
    circleScore?: number;
    location?: { lat: number; lng: number };
  };
}

// Cache for discover feeds (5 minute TTL)
const discoverCache = new Map<string, { data: DiscoverItem[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(tab: string, userId: number, params: any = {}): string {
  const paramStr = Object.keys(params).sort().map(k => `${k}:${params[k]}`).join('|');
  return `${tab}:${userId}:${paramStr}`;
}

function getCachedData(key: string, maxAge: number = CACHE_TTL): DiscoverItem[] | null {
  const cached = discoverCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < maxAge) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: DiscoverItem[]): void {
  discoverCache.set(key, { data, timestamp: Date.now() });
  
  // Cleanup old cache entries
  if (discoverCache.size > 100) {
    const cutoff = Date.now() - (CACHE_TTL * 2);
    for (const [k, v] of discoverCache.entries()) {
      if (v.timestamp < cutoff) {
        discoverCache.delete(k);
      }
    }
  }
}

// Calculate scoring based on the algorithm requirements
function calculateScore(
  item: any,
  type: string,
  circleScore: number = 0,
  isFollowed: boolean = false,
  isNearby: boolean = false
): number {
  const now = Date.now();
  const createdAt = new Date(item.createdAt || item.created_at).getTime();
  const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);
  
  // Recency score (newer = higher, decays over 30 days)
  const recencyScore = Math.max(0, 100 - (daysSinceCreated * 3.33));
  
  // Engagement score (based on available metrics)
  let engagementScore = 0;
  if (type === 'list') {
    engagementScore = (item.savedCount || 0) * 10 + (item.itemCount || 0) * 2;
  } else if (type === 'rating') {
    engagementScore = item.rating * 20;
  } else if (type === 'post') {
    engagementScore = (item.likesCount || 0) * 5 + (item.commentsCount || 0) * 10;
  } else if (type === 'restaurant') {
    engagementScore = (item.reviewCount || 0) * 2 + (item.avgRating || 0) * 15;
  }
  
  // Apply formula: (circle_score × 0.4) + (recency_score × 0.3) + (engagement_score × 0.3)
  let finalScore = (circleScore * 0.4) + (recencyScore * 0.3) + (Math.min(engagementScore, 100) * 0.3);
  
  // Add bonuses
  if (isFollowed) finalScore += (finalScore * 0.2); // 20% bonus for followed users
  if (isNearby) finalScore += (finalScore * 0.1); // 10% bonus for nearby content
  
  // Apply content type multipliers
  const typeMultipliers = {
    list: 1.3,
    rating: 1.1,
    post: 1.0,
    restaurant: 0.8
  };
  
  finalScore *= typeMultipliers[type as keyof typeof typeMultipliers] || 1.0;
  
  return Math.round(finalScore * 100) / 100; // Round to 2 decimal places
}

// Get user's followed user IDs
async function getFollowedUserIds(userId: number): Promise<number[]> {
  const follows = await db
    .select({ followingId: userFollowers.followingId })
    .from(userFollowers)
    .where(eq(userFollowers.followerId, userId));
  
  return follows.map(f => f.followingId);
}

// Get lists for discover feed
async function getDiscoverLists(
  userId: number, 
  followedIds: number[], 
  limit: number = 20,
  ageLimit: number = 30
): Promise<DiscoverItem[]> {
  const cutoffDate = new Date(Date.now() - (ageLimit * 24 * 60 * 60 * 1000));
  
  const listData = await db
    .select({
      id: lists.id,
      name: lists.name,
      description: lists.description,
      createdAt: lists.createdAt,
      createdById: lists.createdById,
      isPublic: lists.isPublic,
      itemCount: sql<number>`(SELECT COUNT(*) FROM restaurant_list_items WHERE list_id = ${lists.id})`,
      savedCount: sql<number>`(SELECT COUNT(*) FROM saved_lists WHERE list_id = ${lists.id})`,
      authorName: users.name,
      authorUsername: users.username,
      authorProfilePicture: users.profilePicture
    })
    .from(lists)
    .innerJoin(users, eq(lists.createdById, users.id))
    .where(and(
      eq(lists.isPublic, true),
      gt(lists.createdAt, cutoffDate),
      sql`(SELECT COUNT(*) FROM restaurant_list_items WHERE list_id = ${lists.id}) > 0` // Only lists with items
    ))
    .orderBy(desc(lists.createdAt))
    .limit(limit * 2); // Get more to filter and score
  
  const items: DiscoverItem[] = [];
  
  for (const list of listData) {
    const isFollowed = followedIds.includes(list.createdById);
    const score = calculateScore(list, 'list', 0, isFollowed, false);
    
    // Quality gate: minimum score of 20 for lists
    if (score >= 20) {
      items.push({
        id: `list_${list.id}`,
        type: 'list',
        content: {
          id: list.id,
          name: list.name,
          description: list.description,
          itemCount: list.itemCount,
          savedCount: list.savedCount,
          isPublic: list.isPublic
        },
        score,
        metadata: {
          author: {
            id: list.createdById.toString(),
            name: list.authorName || list.authorUsername,
            avatar: list.authorProfilePicture
          },
          createdAt: list.createdAt.toISOString(),
          socialProof: isFollowed ? "From someone you follow" : undefined
        }
      });
    }
  }
  
  return items.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Get ratings for discover feed
async function getDiscoverRatings(
  userId: number,
  followedIds: number[],
  limit: number = 20,
  ageLimit: number = 30
): Promise<DiscoverItem[]> {
  const cutoffDate = new Date(Date.now() - (ageLimit * 24 * 60 * 60 * 1000));
  
  const ratingData = await db
    .select({
      id: ratings.id,
      rating: ratings.rating,
      notes: ratings.notes,
      tags: ratings.tags,
      createdAt: ratings.createdAt,
      userId: ratings.userId,
      restaurantId: ratings.restaurantId,
      restaurantName: restaurants.name,
      authorName: users.name,
      authorUsername: users.username,
      authorProfilePicture: users.profilePicture
    })
    .from(ratings)
    .innerJoin(users, eq(ratings.userId, users.id))
    .leftJoin(restaurants, eq(ratings.restaurantId, restaurants.id))
    .where(and(
      gt(ratings.createdAt, cutoffDate),
      sql`${ratings.rating} >= 3` // Only good ratings (3+ stars)
    ))
    .orderBy(desc(ratings.createdAt))
    .limit(limit * 2);
  
  const items: DiscoverItem[] = [];
  
  for (const rating of ratingData) {
    const isFollowed = followedIds.includes(rating.userId);
    const score = calculateScore(rating, 'rating', 0, isFollowed, false);
    
    // Quality gate: minimum score of 15 for ratings
    if (score >= 15) {
      items.push({
        id: `rating_${rating.id}`,
        type: 'rating',
        content: {
          id: rating.id,
          rating: rating.rating,
          notes: rating.notes,
          tags: rating.tags,
          restaurant: {
            id: rating.restaurantId,
            name: rating.restaurantName
          }
        },
        score,
        metadata: {
          author: {
            id: rating.userId.toString(),
            name: rating.authorName || rating.authorUsername,
            avatar: rating.authorProfilePicture
          },
          createdAt: rating.createdAt.toISOString(),
          socialProof: isFollowed ? "From someone you follow" : undefined
        }
      });
    }
  }
  
  return items.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Get posts for discover feed
async function getDiscoverPosts(
  userId: number,
  followedIds: number[],
  limit: number = 20,
  ageLimit: number = 30
): Promise<DiscoverItem[]> {
  const cutoffDate = new Date(Date.now() - (ageLimit * 24 * 60 * 60 * 1000));
  
  const postData = await db
    .select({
      id: posts.id,
      content: posts.content,
      images: posts.images,
      rating: posts.rating,
      createdAt: posts.createdAt,
      userId: posts.userId,
      restaurantId: posts.restaurantId,
      visibility: posts.visibility,
      likesCount: sql<number>`(SELECT COUNT(*) FROM post_likes WHERE post_id = ${posts.id})`,
      commentsCount: sql<number>`(SELECT COUNT(*) FROM post_comments WHERE post_id = ${posts.id})`,
      authorName: users.name,
      authorUsername: users.username,
      authorProfilePicture: users.profilePicture,
      restaurantName: restaurants.name
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
    .where(and(
      eq(posts.visibility, 'public'),
      gt(posts.createdAt, cutoffDate)
    ))
    .orderBy(desc(posts.createdAt))
    .limit(limit * 2);
  
  const items: DiscoverItem[] = [];
  
  for (const post of postData) {
    const isFollowed = followedIds.includes(post.userId);
    const score = calculateScore(post, 'post', 0, isFollowed, false);
    
    // Quality gate: minimum score of 10 for posts
    if (score >= 10) {
      items.push({
        id: `post_${post.id}`,
        type: 'post',
        content: {
          id: post.id,
          content: post.content,
          images: post.images,
          rating: post.rating,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          restaurant: post.restaurantId ? {
            id: post.restaurantId,
            name: post.restaurantName
          } : undefined
        },
        score,
        metadata: {
          author: {
            id: post.userId.toString(),
            name: post.authorName || post.authorUsername,
            avatar: post.authorProfilePicture
          },
          createdAt: post.createdAt.toISOString(),
          socialProof: isFollowed ? "From someone you follow" : undefined
        }
      });
    }
  }
  
  return items.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Combine and sort all content types
async function combineAndSortContent(
  userId: number,
  followedIds: number[],
  limit: number = 20,
  ageLimit: number = 30
): Promise<DiscoverItem[]> {
  const [lists, ratings, posts] = await Promise.all([
    getDiscoverLists(userId, followedIds, Math.ceil(limit * 0.4), ageLimit),
    getDiscoverRatings(userId, followedIds, Math.ceil(limit * 0.3), ageLimit),
    getDiscoverPosts(userId, followedIds, Math.ceil(limit * 0.3), ageLimit)
  ]);
  
  const allItems = [...lists, ...ratings, ...posts];
  
  // Sort by score and return top items
  return allItems
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// GET /api/discover/for-you - Personalized content feed
router.get('/for-you', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    console.log(`🎯 Discover For You feed requested by user ${userId}, limit: ${limit}, offset: ${offset}`);
    
    // Check cache first (30 second TTL for personalized content)
    const cacheKey = getCacheKey('for-you', userId, { limit, offset });
    const cachedData = getCachedData(cacheKey, 30000); // 30 seconds
    if (cachedData) {
      console.log('📦 Returning cached For You feed data');
      return res.json({
        items: cachedData.slice(offset, offset + limit),
        hasMore: cachedData.length > offset + limit,
        totalCount: cachedData.length
      });
    }
    
    const followedIds = await getFollowedUserIds(userId);
    console.log(`👥 User follows ${followedIds.length} users`);
    
    const items = await combineAndSortContent(userId, followedIds, limit + offset, 30);
    
    // Cache the results
    setCachedData(cacheKey, items);
    
    const responseItems = items.slice(offset, offset + limit);
    
    console.log(`✨ Returning ${responseItems.length} items for For You feed`);
    
    res.json({
      items: responseItems,
      hasMore: items.length > offset + limit,
      totalCount: items.length
    });
  } catch (error) {
    console.error('Error fetching For You feed:', error);
    res.status(500).json({ error: 'Failed to fetch For You feed' });
  }
});

// GET /api/discover/trending - Trending content across platform
router.get('/trending', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    console.log(`🔥 Discover Trending feed requested by user ${userId}, limit: ${limit}, offset: ${offset}`);
    
    // Check cache first (5 minute TTL for trending)
    const cacheKey = getCacheKey('trending', userId, { limit, offset });
    const cachedData = getCachedData(cacheKey, 300000); // 5 minutes
    if (cachedData) {
      console.log('📦 Returning cached Trending feed data');
      return res.json({
        items: cachedData.slice(offset, offset + limit),
        hasMore: cachedData.length > offset + limit,
        totalCount: cachedData.length
      });
    }
    
    const followedIds = await getFollowedUserIds(userId);
    
    // For trending, use shorter age limit (7 days) and different scoring
    const items = await combineAndSortContent(userId, followedIds, limit + offset, 7);
    
    // Boost items with higher engagement for trending
    items.forEach(item => {
      if (item.type === 'list' && item.content.savedCount > 5) {
        item.score *= 1.2;
      }
      if (item.type === 'post' && (item.content.likesCount + item.content.commentsCount) > 10) {
        item.score *= 1.2;
      }
      if (item.type === 'rating' && item.content.rating >= 4) {
        item.score *= 1.1;
      }
    });
    
    // Re-sort after boosting
    items.sort((a, b) => b.score - a.score);
    
    // Cache the results
    setCachedData(cacheKey, items);
    
    const responseItems = items.slice(offset, offset + limit);
    
    console.log(`🔥 Returning ${responseItems.length} items for Trending feed`);
    
    res.json({
      items: responseItems,
      hasMore: items.length > offset + limit,
      totalCount: items.length
    });
  } catch (error) {
    console.error('Error fetching Trending feed:', error);
    res.status(500).json({ error: 'Failed to fetch Trending feed' });
  }
});

// GET /api/discover/near-you - Location-based content
router.get('/near-you', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string) || 10000; // 10km default
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    console.log(`📍 Discover Near You feed requested by user ${userId}, location: ${lat},${lng}, radius: ${radius}m`);
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location coordinates required' });
    }
    
    // Check cache first (2 minute TTL for location-based content)
    const cacheKey = getCacheKey('near-you', userId, { lat, lng, radius, limit, offset });
    const cachedData = getCachedData(cacheKey, 120000); // 2 minutes
    if (cachedData) {
      console.log('📦 Returning cached Near You feed data');
      return res.json({
        items: cachedData.slice(offset, offset + limit),
        hasMore: cachedData.length > offset + limit,
        totalCount: cachedData.length
      });
    }
    
    const followedIds = await getFollowedUserIds(userId);
    
    // Get all content first, then filter by location
    const allItems = await combineAndSortContent(userId, followedIds, limit * 3, 30);
    
    // Filter items by location (for now, we'll use a simplified approach)
    // In a real implementation, you'd query restaurants with lat/lng within radius
    const nearbyItems = allItems.map(item => {
      // For demo purposes, randomly assign some items as "nearby"
      // In production, you'd check actual restaurant locations
      const isNearby = Math.random() > 0.7; // 30% chance of being nearby
      if (isNearby) {
        item.score = calculateScore(item.content, item.type, 0, 
          followedIds.includes(parseInt(item.metadata.author.id)), true);
        item.metadata.location = {
          lat: lat + (Math.random() - 0.5) * 0.01, // Within ~1km
          lng: lng + (Math.random() - 0.5) * 0.01
        };
      }
      return { ...item, isNearby };
    })
    .filter(item => item.isNearby)
    .sort((a, b) => b.score - a.score);
    
    // Cache the results
    setCachedData(cacheKey, nearbyItems);
    
    const responseItems = nearbyItems.slice(offset, offset + limit);
    
    console.log(`📍 Returning ${responseItems.length} items for Near You feed`);
    
    res.json({
      items: responseItems,
      hasMore: nearbyItems.length > offset + limit,
      totalCount: nearbyItems.length
    });
  } catch (error) {
    console.error('Error fetching Near You feed:', error);
    res.status(500).json({ error: 'Failed to fetch Near You feed' });
  }
});

export default router;