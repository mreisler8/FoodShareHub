import { Router } from "express";
import { db } from "../db";
import { users, userFollowers, circleMembers, circles, posts, restaurants, restaurantLists, restaurantListItems, savedRestaurants } from "@shared/schema";
import { eq, or, ilike, and, ne, sql, desc, inArray } from "drizzle-orm";
import { authenticate } from "../auth";

const router = Router();

// GET /api/users?query=searchTerm - Enhanced user search with social context
router.get("/", authenticate, async (req, res) => {
  try {
    const { query: searchTerm } = req.query;
    
    if (!searchTerm || typeof searchTerm !== "string") {
      return res.status(400).json({ 
        error: "Search query is required",
        code: "MISSING_QUERY"
      });
    }
    
    if (searchTerm.length < 2) {
      return res.status(400).json({ 
        error: "Search query must be at least 2 characters",
        code: "QUERY_TOO_SHORT"
      });
    }
    
    const searchPattern = `%${searchTerm}%`;
    const currentUserId = req.user!.id;
    
    // Search users with enhanced metadata
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
          // Exclude current user from search results
          ne(users.id, currentUserId)
        )
      )
      .orderBy(desc(users.name))
      .limit(20);

    // Get enhanced metadata for each user
    const enhancedUsers = await Promise.all(userResults.map(async (user) => {
      // Check if current user is following this user
      const followStatus = await db
        .select()
        .from(userFollowers)
        .where(
          and(
            eq(userFollowers.followerId, currentUserId),
            eq(userFollowers.followingId, user.id)
          )
        )
        .limit(1);

      // Get mutual connections count
      const mutualConnections = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(
          and(
            eq(userFollowers.followerId, user.id),
            sql`${userFollowers.followingId} IN (
              SELECT following_id FROM user_followers 
              WHERE follower_id = ${currentUserId}
            )`
          )
        );

      // Get follower count
      const followerCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(eq(userFollowers.followingId, user.id));

      // Get following count
      const followingCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(eq(userFollowers.followerId, user.id));

      // Get mutual circles
      const mutualCircles = await db
        .select({
          id: circles.id,
          name: circles.name,
        })
        .from(circleMembers)
        .innerJoin(circles, eq(circleMembers.circleId, circles.id))
        .where(
          and(
            eq(circleMembers.userId, user.id),
            sql`${circleMembers.circleId} IN (
              SELECT circle_id FROM circle_members 
              WHERE user_id = ${currentUserId}
            )`
          )
        )
        .limit(3);

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        profilePicture: user.profilePicture,
        bio: user.bio,
        diningInterests: user.diningInterests || [],
        preferredCuisines: user.preferredCuisines || [],
        preferredLocation: user.preferredLocation,
        // Social context
        isFollowing: followStatus.length > 0,
        mutualConnections: mutualConnections[0]?.count || 0,
        followerCount: followerCount[0]?.count || 0,
        followingCount: followingCount[0]?.count || 0,
        mutualCircles: mutualCircles,
        // Helper fields for UI
        canAddToCircle: true,
        type: 'user' as const,
      };
    }));

    res.json(enhancedUsers);
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id - Get user profile with enhanced metadata
router.get("/:id", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.id;
    
    // Get user profile
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = user[0];

    // Get social stats
    const followerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followingId, userId));

    const followingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));

    // Check if current user is following this user
    const isFollowing = await db
      .select()
      .from(userFollowers)
      .where(
        and(
          eq(userFollowers.followerId, currentUserId),
          eq(userFollowers.followingId, userId)
        )
      )
      .limit(1);

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
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id/stats - Get user stats
router.get("/:id/stats", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.id;
    
    // Get social stats
    const followerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followingId, userId));

    const followingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));

    // Check if current user is following this user
    const isFollowing = await db
      .select()
      .from(userFollowers)
      .where(
        and(
          eq(userFollowers.followerId, currentUserId),
          eq(userFollowers.followingId, userId)
        )
      )
      .limit(1);

    res.json({
      followers: followerCount[0]?.count || 0,
      following: followingCount[0]?.count || 0,
      isFollowing: isFollowing.length > 0,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id/posts - Get user's posts
router.get("/:id/posts", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Get user posts with restaurant and engagement data
    const userPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        visibility: posts.visibility,
        dishesTried: posts.dishesTried,
        images: posts.images,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        },
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          cuisine: restaurants.cuisine,
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    res.json(userPosts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

// GET /api/users/:id/lists - Get user's restaurant lists
router.get("/:id/lists", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Get user's lists with restaurant counts
    const userLists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        tags: restaurantLists.tags,
        visibility: restaurantLists.visibility,
        createdAt: restaurantLists.createdAt,
        createdById: restaurantLists.createdById,
        shareWithCircle: restaurantLists.shareWithCircle,
        makePublic: restaurantLists.makePublic,
      })
      .from(restaurantLists)
      .where(eq(restaurantLists.createdById, userId))
      .orderBy(desc(restaurantLists.createdAt));

    // Get restaurant counts for each list
    const listIds = userLists.map(list => list.id);
    
    if (listIds.length > 0) {
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
      const listsWithCounts = userLists.map(list => ({
        ...list,
        restaurantCount: countByList[list.id] || 0
      }));

      res.json(listsWithCounts);
    } else {
      res.json(userLists);
    }
  } catch (error) {
    console.error("Error fetching user lists:", error);
    res.status(500).json({ error: "Failed to fetch user lists" });
  }
});

// GET /api/users/:id/circles - Get user's circles
router.get("/:id/circles", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Get user's circles through membership
    const userCircles = await db
      .select({
        id: circles.id,
        name: circles.name,
        description: circles.description,
        isPrivate: circles.isPrivate,
        createdAt: circles.createdAt,
        creatorId: circles.creatorId,
        primaryCuisine: circles.primaryCuisine,
        priceRange: circles.priceRange,
        location: circles.location,
        memberCount: circles.memberCount,
        featured: circles.featured,
        trending: circles.trending,
      })
      .from(circles)
      .innerJoin(circleMembers, eq(circleMembers.circleId, circles.id))
      .where(eq(circleMembers.userId, userId))
      .orderBy(desc(circles.createdAt));

    res.json(userCircles);
  } catch (error) {
    console.error("Error fetching user circles:", error);
    res.status(500).json({ error: "Failed to fetch user circles" });
  }
});

// GET /api/users/:id/saved - Get user's saved restaurants
router.get("/:id/saved", authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // For now, return empty array to fix the Profile page runtime error
    // TODO: Implement proper saved restaurants functionality
    res.json([]);
  } catch (error) {
    console.error("Error fetching user saved restaurants:", error);
    res.status(500).json({ error: "Failed to fetch saved restaurants" });
  }
});

// PUT /api/users/settings - Update user settings
router.put("/settings", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const updateData = req.body;
    
    // Filter out undefined values and only update provided fields
    const filteredUpdateData: any = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        filteredUpdateData[key] = updateData[key];
      }
    });
    
    // Update user settings
    const updatedUser = await db
      .update(users)
      .set(filteredUpdateData)
      .where(eq(users.id, userId))
      .returning();
    
    if (updatedUser.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(updatedUser[0]);
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ error: "Failed to update user settings" });
  }
});

export default router;