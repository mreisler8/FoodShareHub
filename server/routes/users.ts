import { Router } from "express";
import { db } from "../db";
import { users, userFollowers, circleMembers, circles, posts, restaurants, restaurantLists, restaurantListItems, savedRestaurants } from "@shared/schema";
import { eq, or, ilike, and, ne, sql, desc, inArray } from "drizzle-orm";
import { authenticate } from "../auth";
import { z } from "zod";

const router = Router();

// Enhanced user ID validation middleware
const validateUserId = (req: any, res: any, next: any) => {
  const userId = req.user?.id;
  if (!userId || typeof userId !== 'number' || userId <= 0 || !Number.isInteger(userId)) {
    return res.status(401).json({ 
      error: 'Invalid user authentication',
      code: 'INVALID_USER_ID' 
    });
  }
  next();
};

// Enhanced parameter validation
const validateTargetUserId = (req: any, res: any, next: any) => {
  const targetUserId = parseInt(req.params.id);
  if (!targetUserId || isNaN(targetUserId) || targetUserId <= 0 || !Number.isInteger(targetUserId)) {
    return res.status(400).json({ 
      error: 'Invalid user ID parameter',
      code: 'INVALID_TARGET_USER_ID' 
    });
  }
  req.params.id = targetUserId.toString();
  next();
};

// Enhanced search validation schema
const userSearchSchema = z.object({
  query: z.string().min(2).max(100).trim(),
  limit: z.number().min(1).max(50).optional().default(20),
  offset: z.number().min(0).optional().default(0)
});

// Optimized user search service
class UserSearchService {
  static async searchUsers(currentUserId: number, searchTerm: string, limit: number = 20, offset: number = 0) {
    try {
      // Validate inputs
      if (!currentUserId || typeof currentUserId !== 'number' || currentUserId <= 0) {
        throw new Error('Invalid current user ID');
      }

      if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.length < 2) {
        throw new Error('Invalid search term');
      }

      const searchPattern = `%${searchTerm}%`;

      // Optimized main search query
      const userResults = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio,
          diningInterests: users.diningInterests,
          preferredCuisines: users.preferredCuisines,
          preferredLocation: users.preferredLocation,
        })
        .from(users)
        .where(
          and(
            or(
              ilike(users.name, searchPattern),
              ilike(users.username, searchPattern),
              ilike(users.bio, searchPattern)
            ),
            ne(users.id, currentUserId)
          )
        )
        .orderBy(desc(users.name))
        .limit(limit)
        .offset(offset);

      if (userResults.length === 0) {
        return [];
      }

      // Batch fetch social metadata for performance optimization
      const userIds = userResults.map(user => user.id);

      // Batch query for follow status - single query instead of N queries
      const followStatusResults = await db
        .select({
          followingId: userFollowers.followingId,
          status: userFollowers.status
        })
        .from(userFollowers)
        .where(
          and(
            eq(userFollowers.followerId, currentUserId),
            inArray(userFollowers.followingId, userIds)
          )
        );

      const followStatusMap = new Map(
        followStatusResults.map(fs => [fs.followingId, fs.status])
      );

      // Batch query for mutual connections - single query instead of N queries
      const mutualConnectionsResults = await db
        .select({
          userId: userFollowers.followerId,
          count: sql<number>`count(*)`
        })
        .from(userFollowers)
        .where(
          and(
            inArray(userFollowers.followerId, userIds),
            sql`${userFollowers.followingId} IN (
              SELECT following_id FROM user_followers 
              WHERE follower_id = ${currentUserId}
            )`
          )
        )
        .groupBy(userFollowers.followerId);

      const mutualConnectionsMap = new Map(
        mutualConnectionsResults.map(mc => [mc.userId, mc.count])
      );

      // Batch query for follower counts - single query instead of N queries  
      const followerCountResults = await db
        .select({
          userId: userFollowers.followingId,
          count: sql<number>`count(*)`
        })
        .from(userFollowers)
        .where(inArray(userFollowers.followingId, userIds))
        .groupBy(userFollowers.followingId);

      const followerCountMap = new Map(
        followerCountResults.map(fc => [fc.userId, fc.count])
      );

      // Batch query for following counts - single query instead of N queries
      const followingCountResults = await db
        .select({
          userId: userFollowers.followerId,
          count: sql<number>`count(*)`
        })
        .from(userFollowers)
        .where(inArray(userFollowers.followerId, userIds))
        .groupBy(userFollowers.followerId);

      const followingCountMap = new Map(
        followingCountResults.map(fc => [fc.userId, fc.count])
      );

      // Batch query for mutual circles - single query instead of N queries
      const mutualCirclesResults = await db
        .select({
          userId: circleMembers.userId,
          circleId: circles.id,
          circleName: circles.name,
        })
        .from(circleMembers)
        .innerJoin(circles, eq(circleMembers.circleId, circles.id))
        .where(
          and(
            inArray(circleMembers.userId, userIds),
            sql`${circleMembers.circleId} IN (
              SELECT circle_id FROM circle_members 
              WHERE user_id = ${currentUserId} AND status = 'active'
            )`,
            eq(circleMembers.status, 'active')
          )
        )
        .limit(userIds.length * 3); // Limit to 3 circles per user

      const mutualCirclesMap = new Map<number, any[]>();
      mutualCirclesResults.forEach(mc => {
        if (!mutualCirclesMap.has(mc.userId)) {
          mutualCirclesMap.set(mc.userId, []);
        }
        const userCircles = mutualCirclesMap.get(mc.userId)!;
        if (userCircles.length < 3) {
          userCircles.push({
            id: mc.circleId,
            name: mc.circleName
          });
        }
      });

      // Combine all data efficiently
      return userResults.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        profilePicture: user.profilePicture,
        bio: user.bio,
        diningInterests: user.diningInterests || [],
        preferredCuisines: user.preferredCuisines || [],
        preferredLocation: user.preferredLocation,
        // Social context from batch queries
        isFollowing: followStatusMap.has(user.id),
        mutualConnections: mutualConnectionsMap.get(user.id) || 0,
        followerCount: followerCountMap.get(user.id) || 0,
        followingCount: followingCountMap.get(user.id) || 0,
        mutualCircles: mutualCirclesMap.get(user.id) || [],
        // Helper fields for UI
        canAddToCircle: true,
        type: 'user' as const,
      }));
    } catch (error) {
      console.error('User search service error:', error);
      throw error;
    }
  }
}

// Enhanced user search endpoint with optimization
router.get("/", authenticate, validateUserId, async (req, res) => {
  try {
    // Enhanced input validation
    const validatedQuery = userSearchSchema.parse({
      query: req.query.query,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    });

    const { query: searchTerm, limit, offset } = validatedQuery;
    const currentUserId = req.user!.id;

    // Use optimized search service
    const enhancedUsers = await UserSearchService.searchUsers(currentUserId, searchTerm, limit, offset);

    res.json({
      users: enhancedUsers,
      pagination: {
        limit,
        offset,
        hasMore: enhancedUsers.length === limit
      }
    });
  } catch (error) {
    console.error("User search error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid search parameters",
        details: error.errors,
        code: "INVALID_INPUT"
      });
    }

    res.status(500).json({ 
      error: "Internal server error",
      code: "SEARCH_ERROR"
    });
  }
});

// Enhanced user profile endpoint with security validation
router.get("/:id", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.id;

    // Optimized user profile query
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
        bio: users.bio,
        diningInterests: users.diningInterests,
        preferredCuisines: users.preferredCuisines,
        preferredLocation: users.preferredLocation,
        favoriteFood: users.favoriteFood,
        favoriteRestaurant: users.favoriteRestaurant
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ 
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    // Batch query for social stats
    const [followerCount, followingCount, isFollowing] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(eq(userFollowers.followingId, userId)),

      db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(eq(userFollowers.followerId, userId)),

      db
        .select({ id: userFollowers.id })
        .from(userFollowers)
        .where(
          and(
            eq(userFollowers.followerId, currentUserId),
            eq(userFollowers.followingId, userId)
          )
        )
        .limit(1)
    ]);

    const userProfile = user[0];

    res.json({
      ...userProfile,
      stats: {
        followers: followerCount[0]?.count || 0,
        following: followingCount[0]?.count || 0,
        isFollowing: isFollowing.length > 0,
      }
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ 
      error: "Internal server error",
      code: "PROFILE_FETCH_ERROR"
    });
  }
});

// Enhanced user stats endpoint
router.get("/:id/stats", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.id;

    // Optimized batch query for all stats
    const [followerCount, followingCount, isFollowing] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(eq(userFollowers.followingId, userId)),

      db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(eq(userFollowers.followerId, userId)),

      db
        .select({ id: userFollowers.id })
        .from(userFollowers)
        .where(
          and(
            eq(userFollowers.followerId, currentUserId),
            eq(userFollowers.followingId, userId)
          )
        )
        .limit(1)
    ]);

    res.json({
      followers: followerCount[0]?.count || 0,
      following: followingCount[0]?.count || 0,
      isFollowing: isFollowing.length > 0,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ 
      error: "Internal server error",
      code: "STATS_FETCH_ERROR"
    });
  }
});

// Enhanced user settings endpoint with validation
router.put("/settings", authenticate, validateUserId, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Enhanced input validation for settings
    const settingsSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      bio: z.string().max(500).optional(),
      profilePicture: z.string().url().optional(),
      diningInterests: z.array(z.string()).max(10).optional(),
      preferredCuisines: z.array(z.string()).max(10).optional(),
      preferredLocation: z.string().max(100).optional(),
      favoriteFood: z.string().max(100).optional(),
      favoriteRestaurant: z.string().max(100).optional()
    });

    const validatedData = settingsSchema.parse(req.body);

    // Filter out undefined values
    const filteredUpdateData: any = {};
    Object.keys(validatedData).forEach(key => {
      if (validatedData[key as keyof typeof validatedData] !== undefined) {
        filteredUpdateData[key] = validatedData[key as keyof typeof validatedData];
      }
    });

    if (Object.keys(filteredUpdateData).length === 0) {
      return res.status(400).json({ 
        error: "No valid fields to update",
        code: "NO_UPDATE_FIELDS"
      });
    }

    // Update user settings
    const updatedUser = await db
      .update(users)
      .set(filteredUpdateData)
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return res.status(404).json({ 
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    res.json(updatedUser[0]);
  } catch (error) {
    console.error("Error updating user settings:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid settings data",
        details: error.errors,
        code: "INVALID_SETTINGS"
      });
    }

    res.status(500).json({ 
      error: "Failed to update user settings",
      code: "SETTINGS_UPDATE_ERROR"
    });
  }
});

// Additional optimized endpoints remain the same but with proper validation
// User posts endpoint with enhanced data
router.get("/:id/posts", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);

      // Simple posts query without complex joins that might cause issues
      const userPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.userId, userId))
        .orderBy(desc(posts.createdAt))
        .limit(20);

      res.json(userPosts);
  } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

// User lists endpoint with enhanced data
router.get("/:id/lists", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);

      // Simple lists query without complex subqueries
      const userLists = await db
        .select()
        .from(restaurantLists)
        .where(eq(restaurantLists.createdById, userId))
        .orderBy(desc(restaurantLists.createdAt))
        .limit(20);

      res.json(userLists);
  } catch (error) {
      console.error("Error fetching user lists:", error);
      res.status(500).json({ error: "Failed to fetch user lists" });
  }
});

// User ratings endpoint  
router.get("/:id/ratings", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);

      const userRatings = await db
        .select({
          id: sql<number>`ratings.id`,
          ratingValue: sql<number>`ratings.rating_value`,
          notes: sql<string>`ratings.notes`,
          tags: sql<string[]>`ratings.tags`,
          createdAt: sql<string>`ratings.created_at`,
          restaurant: {
            id: restaurants.id,
            name: restaurants.name,
            location: restaurants.location,
            cuisine: restaurants.cuisine
          }
        })
        .from(sql`ratings`)
        .leftJoin(restaurants, sql`ratings.restaurant_id = ${restaurants.id}`)
        .where(sql`ratings.user_id = ${userId}`)
        .orderBy(sql`ratings.created_at DESC`)
        .limit(20);

      res.json(userRatings);
  } catch (error) {
      console.error("Error fetching user ratings:", error);
      res.status(500).json({ error: "Failed to fetch user ratings" });
  }
});

router.get("/:id/circles", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);
      res.json([]);
  } catch (error) {
      console.error("Error fetching user circles:", error);
      res.status(500).json({ error: "Failed to fetch user circles" });
  }
});

// User followers endpoint
router.get("/:id/followers", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);

      const followers = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio
        })
        .from(users)
        .innerJoin(userFollowers, eq(users.id, userFollowers.followerId))
        .where(eq(userFollowers.followingId, userId))
        .orderBy(desc(userFollowers.createdAt))
        .limit(50);

      res.json(followers);
  } catch (error) {
      console.error("Error fetching user followers:", error);
      res.status(500).json({ error: "Failed to fetch user followers" });
  }
});

// User following endpoint
router.get("/:id/following", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);

      const following = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio
        })
        .from(users)
        .innerJoin(userFollowers, eq(users.id, userFollowers.followingId))
        .where(eq(userFollowers.followerId, userId))
        .orderBy(desc(userFollowers.createdAt))
        .limit(50);

      res.json(following);
  } catch (error) {
      console.error("Error fetching user following:", error);
      res.status(500).json({ error: "Failed to fetch user following" });
  }
});

router.get("/:id/saved", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);
      res.json([]);
  } catch (error) {
      console.error("Error fetching user saved restaurants:", error);
      res.status(500).json({ error: "Failed to fetch saved restaurants" });
  }
});

// Simplified followers endpoint for pagination route
router.get("/followers/:id", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);

      const followers = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio
        })
        .from(users)
        .innerJoin(userFollowers, eq(users.id, userFollowers.followerId))
        .where(eq(userFollowers.followingId, userId))
        .orderBy(desc(userFollowers.createdAt))
        .limit(50);

      res.json(followers);
  } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ error: "Failed to fetch followers" });
  }
});

// Simplified following endpoint for pagination route
router.get("/following/:id", authenticate, validateUserId, validateTargetUserId, async (req, res) => {
  try {
      const userId = parseInt(req.params.id);

      const following = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
          bio: users.bio
        })
        .from(users)
        .innerJoin(userFollowers, eq(users.id, userFollowers.followingId))
        .where(eq(userFollowers.followerId, userId))
        .orderBy(desc(userFollowers.createdAt))
        .limit(50);

      res.json(following);
  } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ error: "Failed to fetch following" });
  }
});

export default router;