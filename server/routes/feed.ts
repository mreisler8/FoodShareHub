
import { Router } from 'express';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import { db } from '../db';
import { 
  restaurantLists, 
  users, 
  circleMembers, 
  circles,
  userFollowers,
  savedLists,
  restaurantListItems
} from '../../shared/schema';
import { authenticate } from '../auth';

const router = Router();

// Get personalized feed for user
router.get('/foryou', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get user's followed users
    const followedUsers = await db
      .select({ followingId: userFollowers.followingId })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));

    const followedUserIds = followedUsers.map(f => f.followingId);

    // Get user's circles
    const userCircles = await db
      .select({ circleId: circleMembers.circleId })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));

    const circleIds = userCircles.map(c => c.circleId);

    // Get lists from followed users and circles
    let listsQuery = db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        coverImage: restaurantLists.coverImage,
        tags: restaurantLists.tags,
        primaryLocation: restaurantLists.primaryLocation,
        createdAt: restaurantLists.createdAt,
        createdById: restaurantLists.createdById,
        creator: {
          id: users.id,
          name: users.name,
          username: users.username,
        }
      })
      .from(restaurantLists)
      .leftJoin(users, eq(restaurantLists.createdById, users.id))
      .where(
        and(
          eq(restaurantLists.isPublic, true),
          or(
            inArray(restaurantLists.createdById, followedUserIds),
            inArray(restaurantLists.circleId, circleIds)
          )
        )
      )
      .orderBy(desc(restaurantLists.createdAt))
      .limit(limit)
      .offset(offset);

    const lists = await listsQuery;

    // Get restaurant counts for each list
    if (lists.length > 0) {
      const listIds = lists.map(l => l.id);
      const restaurantCounts = await db
        .select({
          listId: restaurantListItems.listId,
          count: sql<number>`count(*)::int`
        })
        .from(restaurantListItems)
        .where(inArray(restaurantListItems.listId, listIds))
        .groupBy(restaurantListItems.listId);

      const countByList: Record<number, number> = {};
      restaurantCounts.forEach(({ listId, count }) => {
        countByList[listId] = count;
      });

      // Add restaurant count to each list
      lists.forEach(list => {
        (list as any).restaurantCount = countByList[list.id] || 0;
      });
    }

    // Get follow suggestions for new users
    const followSuggestions = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
        bio: users.bio
      })
      .from(users)
      .where(
        and(
          sql`${users.id} != ${userId}`,
          sql`${users.id} NOT IN (
            SELECT following_id FROM user_followers WHERE follower_id = ${userId}
          )`
        )
      )
      .limit(6);

    // Get popular circles
    const popularCircles = await db
      .select({
        id: circles.id,
        name: circles.name,
        description: circles.description,
        memberCount: circles.memberCount,
        tags: circles.tags,
        location: circles.location,
      })
      .from(circles)
      .where(eq(circles.allowPublicJoin, true))
      .orderBy(desc(circles.memberCount))
      .limit(3);

    res.json({
      lists,
      followSuggestions,
      circles: popularCircles
    });
  } catch (error) {
    console.error('Error fetching for you feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending feed
router.get('/trending', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get trending lists based on view count and recent saves
    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        coverImage: restaurantLists.coverImage,
        tags: restaurantLists.tags,
        primaryLocation: restaurantLists.primaryLocation,
        viewCount: restaurantLists.viewCount,
        saveCount: restaurantLists.saveCount,
        createdAt: restaurantLists.createdAt,
        createdById: restaurantLists.createdById,
        creator: {
          id: users.id,
          name: users.name,
          username: users.username,
        }
      })
      .from(restaurantLists)
      .leftJoin(users, eq(restaurantLists.createdById, users.id))
      .where(eq(restaurantLists.isPublic, true))
      .orderBy(desc(restaurantLists.viewCount), desc(restaurantLists.saveCount))
      .limit(limit)
      .offset(offset);

    // Get restaurant counts
    if (lists.length > 0) {
      const listIds = lists.map(l => l.id);
      const restaurantCounts = await db
        .select({
          listId: restaurantListItems.listId,
          count: sql<number>`count(*)::int`
        })
        .from(restaurantListItems)
        .where(inArray(restaurantListItems.listId, listIds))
        .groupBy(restaurantListItems.listId);

      const countByList: Record<number, number> = {};
      restaurantCounts.forEach(({ listId, count }) => {
        countByList[listId] = count;
      });

      lists.forEach(list => {
        (list as any).restaurantCount = countByList[list.id] || 0;
      });
    }

    res.json({
      lists,
      followSuggestions: [],
      circles: []
    });
  } catch (error) {
    console.error('Error fetching trending feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nearby feed (placeholder for future geo functionality)
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // For now, return public lists with location data
    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        coverImage: restaurantLists.coverImage,
        tags: restaurantLists.tags,
        primaryLocation: restaurantLists.primaryLocation,
        createdAt: restaurantLists.createdAt,
        createdById: restaurantLists.createdById,
        creator: {
          id: users.id,
          name: users.name,
          username: users.username,
        }
      })
      .from(restaurantLists)
      .leftJoin(users, eq(restaurantLists.createdById, users.id))
      .where(
        and(
          eq(restaurantLists.isPublic, true),
          sql`${restaurantLists.primaryLocation} IS NOT NULL`
        )
      )
      .orderBy(desc(restaurantLists.createdAt))
      .limit(limit)
      .offset(offset);

    // Get restaurant counts
    if (lists.length > 0) {
      const listIds = lists.map(l => l.id);
      const restaurantCounts = await db
        .select({
          listId: restaurantListItems.listId,
          count: sql<number>`count(*)::int`
        })
        .from(restaurantListItems)
        .where(inArray(restaurantListItems.listId, listIds))
        .groupBy(restaurantListItems.listId);

      const countByList: Record<number, number> = {};
      restaurantCounts.forEach(({ listId, count }) => {
        countByList[listId] = count;
      });

      lists.forEach(list => {
        (list as any).restaurantCount = countByList[list.id] || 0;
      });
    }

    res.json({
      lists,
      followSuggestions: [],
      circles: []
    });
  } catch (error) {
    console.error('Error fetching nearby feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router };
