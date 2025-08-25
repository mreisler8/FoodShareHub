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
  };
}

// Simple version without complex caching
router.get('/for-you', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🎯 Discover For You feed requested by user ${userId}, limit: ${req.query.limit}, offset: ${req.query.offset}`);
    
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Simple approach - get recent public lists first
    const recentLists = await db
      .select()
      .from(lists)
      .where(and(
        eq(lists.isPublic, true),
        gt(lists.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      ))
      .orderBy(desc(lists.createdAt))
      .limit(20);

    // Get recent ratings 
    const recentRatings = await db
      .select()
      .from(ratings)
      .where(and(
        gt(ratings.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        sql`${ratings.rating} >= 3` // Only good ratings
      ))
      .orderBy(desc(ratings.createdAt))
      .limit(20);

    // Get user data for list creators
    const listCreatorIds = recentLists.map(list => list.createdById);
    const listCreators = listCreatorIds.length > 0 ? await db
      .select()
      .from(users)
      .where(inArray(users.id, listCreatorIds)) : [];

    // Get user data for rating creators
    const ratingUserIds = recentRatings.map(rating => rating.userId);
    const ratingUsers = ratingUserIds.length > 0 ? await db
      .select()
      .from(users)
      .where(inArray(users.id, ratingUserIds)) : [];

    // Get restaurant data for ratings
    const restaurantIds = recentRatings.map(rating => rating.restaurantId).filter(Boolean);
    const ratingRestaurants = restaurantIds.length > 0 ? await db
      .select()
      .from(restaurants)
      .where(inArray(restaurants.id, restaurantIds)) : [];

    // Get user's followed users
    const followedUsers = await db
      .select({ followedId: userFollowers.followedId })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));

    const followedIds = followedUsers.map(f => f.followedId);
    console.log(`👥 User follows ${followedIds.length} users`);

    const items: DiscoverItem[] = [];

    // Process lists
    for (const list of recentLists) {
      const creator = listCreators.find(u => u.id === list.createdById);
      const isFollowed = followedIds.includes(list.createdById);
      
      items.push({
        id: `list_${list.id}`,
        type: 'list',
        content: {
          id: list.id,
          name: list.name,
          description: list.description,
          itemCount: 0, // Simplified
          savedCount: 0, // Simplified
          isPublic: list.isPublic
        },
        score: isFollowed ? 100 : 50,
        metadata: {
          author: {
            id: list.createdById.toString(),
            name: creator?.name || creator?.username || 'Unknown',
            avatar: creator?.profilePicture || undefined
          },
          createdAt: list.createdAt.toISOString(),
          socialProof: isFollowed ? "From someone you follow" : undefined
        }
      });
    }

    // Process ratings
    for (const rating of recentRatings) {
      const ratingUser = ratingUsers.find(u => u.id === rating.userId);
      const restaurant = ratingRestaurants.find(r => r.id === rating.restaurantId);
      const isFollowed = followedIds.includes(rating.userId);
      
      items.push({
        id: `rating_${rating.id}`,
        type: 'rating',
        content: {
          id: rating.id,
          rating: rating.rating,
          notes: rating.note,
          tags: rating.tags,
          restaurantName: restaurant?.name || 'Unknown Restaurant'
        },
        score: isFollowed ? 90 : 40,
        metadata: {
          author: {
            id: rating.userId.toString(),
            name: ratingUser?.name || ratingUser?.username || 'Unknown',
            avatar: ratingUser?.profilePicture || undefined
          },
          createdAt: rating.createdAt.toISOString(),
          socialProof: isFollowed ? "From someone you follow" : undefined
        }
      });
    }

    // Sort by score and apply pagination
    const sortedItems = items
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    console.log(`📋 Returning ${sortedItems.length} items for discover feed`);

    res.json({
      items: sortedItems,
      hasMore: (offset + limit) < items.length,
      total: items.length
    });

  } catch (error) {
    console.error('Error fetching For You feed:', error);
    res.status(500).json({ error: 'Failed to fetch For You feed' });
  }
});

router.get('/trending', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Simple trending: recent public lists and high-rated items
    const trendingLists = await db
      .select({
        list: lists,
        user: users
      })
      .from(lists)
      .innerJoin(users, eq(lists.createdById, users.id))
      .where(and(
        eq(lists.isPublic, true),
        gt(lists.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      ))
      .orderBy(desc(lists.createdAt))
      .limit(limit);

    const items: DiscoverItem[] = trendingLists.map(row => {
      const list = row.list;
      const user = row.user;
      
      return {
        id: `trending_list_${list.id}`,
        type: 'list',
        content: {
          id: list.id,
          name: list.name,
          description: list.description,
          itemCount: 0,
          savedCount: 0,
          isPublic: list.isPublic
        },
        score: 75,
        metadata: {
          author: {
            id: list.createdById.toString(),
            name: user.name || user.username || 'Unknown',
            avatar: user.profilePicture || undefined
          },
          createdAt: list.createdAt.toISOString(),
          socialProof: "Trending now"
        }
      };
    });

    res.json({
      items,
      hasMore: false,
      total: items.length
    });

  } catch (error) {
    console.error('Error fetching trending feed:', error);
    res.status(500).json({ error: 'Failed to fetch trending feed' });
  }
});

router.get('/near-you', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Simple placeholder - return recent public lists
    const nearbyLists = await db
      .select({
        list: lists,
        user: users
      })
      .from(lists)
      .innerJoin(users, eq(lists.createdById, users.id))
      .where(eq(lists.isPublic, true))
      .orderBy(desc(lists.createdAt))
      .limit(limit);

    const items: DiscoverItem[] = nearbyLists.map(row => {
      const list = row.list;
      const user = row.user;
      
      return {
        id: `nearby_list_${list.id}`,
        type: 'list',
        content: {
          id: list.id,
          name: list.name,
          description: list.description,
          itemCount: 0,
          savedCount: 0,
          isPublic: list.isPublic
        },
        score: 60,
        metadata: {
          author: {
            id: list.createdById.toString(),
            name: user.name || user.username || 'Unknown',
            avatar: user.profilePicture || undefined
          },
          createdAt: list.createdAt.toISOString(),
          socialProof: "Near you"
        }
      };
    });

    res.json({
      items,
      hasMore: false,
      total: items.length
    });

  } catch (error) {
    console.error('Error fetching nearby feed:', error);
    res.status(500).json({ error: 'Failed to fetch nearby feed' });
  }
});

export default router;