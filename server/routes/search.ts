import { Router } from "express";
import { authenticate } from "../auth";
import { db } from "../db";
import { restaurants, restaurantLists, posts, users } from "../../shared/schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";

const router = Router();

// Unified search endpoint
router.get("/unified", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Search query is required" });
    }
    
    const searchTerm = q.trim();
    if (searchTerm.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }
    
    const searchPattern = `%${searchTerm}%`;
    
    // Search restaurants
    const restaurantResults = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        location: restaurants.location,
        category: restaurants.category,
        priceRange: restaurants.priceRange,
        imageUrl: restaurants.imageUrl,
        type: sql<string>`'restaurant'`.as('type')
      })
      .from(restaurants)
      .where(
        or(
          like(restaurants.name, searchPattern),
          like(restaurants.location, searchPattern),
          like(restaurants.category, searchPattern)
        )
      )
      .limit(5);
    
    // Search lists
    const listResults = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        tags: restaurantLists.tags,
        createdById: restaurantLists.createdById,
        isPublic: restaurantLists.isPublic,
        type: sql<string>`'list'`.as('type')
      })
      .from(restaurantLists)
      .where(
        and(
          or(
            like(restaurantLists.name, searchPattern),
            like(restaurantLists.description, searchPattern)
          ),
          or(
            eq(restaurantLists.isPublic, true),
            eq(restaurantLists.createdById, req.user!.id)
          )
        )
      )
      .limit(5);
    
    // Search posts
    const postResults = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        userId: posts.userId,
        restaurantId: posts.restaurantId,
        createdAt: posts.createdAt,
        type: sql<string>`'post'`.as('type')
      })
      .from(posts)
      .where(
        and(
          like(posts.content, searchPattern),
          eq(posts.visibility, "public")
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(5);
    
    // Search users
    const userResults = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        bio: users.bio,
        profilePicture: users.profilePicture,
        type: sql<string>`'user'`.as('type')
      })
      .from(users)
      .where(
        or(
          like(users.name, searchPattern),
          like(users.username, searchPattern),
          like(users.bio, searchPattern)
        )
      )
      .limit(5);
    
    res.json({
      restaurants: restaurantResults,
      lists: listResults,
      posts: postResults,
      users: userResults
    });
    
  } catch (error) {
    console.error("Unified search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get trending content for search modal
router.get("/trending", authenticate, async (req, res) => {
  try {
    // Get trending restaurants (by post count)
    const trendingRestaurants = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        location: restaurants.location,
        category: restaurants.category,
        postCount: sql<number>`COUNT(${posts.id})`.as('postCount'),
        type: sql<string>`'restaurant'`.as('type')
      })
      .from(restaurants)
      .leftJoin(posts, eq(restaurants.id, posts.restaurantId))
      .groupBy(restaurants.id)
      .orderBy(desc(sql`COUNT(${posts.id})`))
      .limit(3);
    
    // Get trending lists (by view count)
    const trendingLists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        viewCount: restaurantLists.viewCount,
        type: sql<string>`'list'`.as('type')
      })
      .from(restaurantLists)
      .where(eq(restaurantLists.isPublic, true))
      .orderBy(desc(restaurantLists.viewCount))
      .limit(2);
    
    res.json({
      trending: [...trendingRestaurants, ...trendingLists]
    });
    
  } catch (error) {
    console.error("Trending search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;