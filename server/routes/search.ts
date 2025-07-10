
import { Router } from "express";
import { authenticate } from "../auth";
import { db } from "../db";
import { restaurants, restaurantLists, posts, users } from "../../shared/schema";
import { eq, and, or, like, desc, sql, ilike } from "drizzle-orm";

const router = Router();

// Unified search endpoint with consistent response format
router.get("/", authenticate, async (req, res) => {
  try {
    const { q, type = "all" } = req.query;
    
    if (!q || typeof q !== "string") {
      return res.status(400).json({ 
        error: "Search query is required",
        code: "MISSING_QUERY"
      });
    }
    
    const searchTerm = q.trim();
    if (searchTerm.length < 2) {
      return res.status(400).json({ 
        error: "Search query must be at least 2 characters",
        code: "QUERY_TOO_SHORT"
      });
    }
    
    const searchPattern = `%${searchTerm}%`;
    const results: any[] = [];
    
    // Search restaurants with consistent format
    if (type === "all" || type === "restaurants") {
      const restaurantResults = await db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          category: restaurants.category,
          priceRange: restaurants.priceRange,
          imageUrl: restaurants.imageUrl,
          cuisine: restaurants.cuisine,
          address: restaurants.address,
          avgRating: sql<number>`4.2`.as('avgRating'), // Default rating for now
        })
        .from(restaurants)
        .where(
          or(
            ilike(restaurants.name, searchPattern),
            ilike(restaurants.location, searchPattern),
            ilike(restaurants.category, searchPattern),
            ilike(restaurants.cuisine, searchPattern)
          )
        )
        .limit(10);
      
      // Transform to unified format
      const formattedRestaurants = restaurantResults.map(r => ({
        id: r.id.toString(),
        name: r.name,
        thumbnailUrl: r.imageUrl,
        avgRating: r.avgRating,
        location: r.location,
        category: r.category,
        priceRange: r.priceRange,
        cuisine: r.cuisine,
        address: r.address,
        source: 'database' as const,
        type: 'restaurant' as const
      }));
      
      results.push(...formattedRestaurants);
    }
    
    // Search lists
    if (type === "all" || type === "lists") {
      const listResults = await db
        .select({
          id: restaurantLists.id,
          name: restaurantLists.name,
          description: restaurantLists.description,
          tags: restaurantLists.tags,
          createdById: restaurantLists.createdById,
          isPublic: restaurantLists.isPublic,
          viewCount: restaurantLists.viewCount,
        })
        .from(restaurantLists)
        .where(
          and(
            or(
              ilike(restaurantLists.name, searchPattern),
              ilike(restaurantLists.description, searchPattern)
            ),
            or(
              eq(restaurantLists.isPublic, true),
              eq(restaurantLists.createdById, req.user!.id)
            )
          )
        )
        .limit(5);
      
      const formattedLists = listResults.map(l => ({
        id: l.id.toString(),
        name: l.name,
        subtitle: l.description || `${l.tags?.length || 0} tags`,
        type: 'list' as const
      }));
      
      results.push(...formattedLists);
    }
    
    // Search posts
    if (type === "all" || type === "posts") {
      const postResults = await db
        .select({
          id: posts.id,
          content: posts.content,
          rating: posts.rating,
          userId: posts.userId,
          restaurantId: posts.restaurantId,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .where(
          and(
            ilike(posts.content, searchPattern),
            // Add visibility check here when implemented
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(5);
      
      const formattedPosts = postResults.map(p => ({
        id: p.id.toString(),
        name: p.content.substring(0, 50) + '...',
        subtitle: `${p.rating} stars`,
        type: 'post' as const
      }));
      
      results.push(...formattedPosts);
    }
    
    // Search users
    if (type === "all" || type === "users") {
      const userResults = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          bio: users.bio,
          profilePicture: users.profilePicture,
        })
        .from(users)
        .where(
          or(
            ilike(users.name, searchPattern),
            ilike(users.username, searchPattern),
            ilike(users.bio, searchPattern)
          )
        )
        .limit(5);
      
      const formattedUsers = userResults.map(u => ({
        id: u.id.toString(),
        name: u.name,
        subtitle: `@${u.username}`,
        avatar: u.profilePicture,
        type: 'user' as const
      }));
      
      results.push(...formattedUsers);
    }
    
    // Return unified format for both single type and multi-type searches
    if (type !== "all") {
      return res.json(results);
    }
    
    // For unified search, group by type
    const grouped = {
      restaurants: results.filter(r => r.type === 'restaurant'),
      lists: results.filter(r => r.type === 'list'),
      posts: results.filter(r => r.type === 'post'),
      users: results.filter(r => r.type === 'user')
    };
    
    res.json(grouped);
    
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ 
      error: "Search failed. Please try again.",
      code: "SEARCH_ERROR"
    });
  }
});

// Unified search endpoint (alias for backward compatibility)
router.get("/unified", authenticate, async (req, res) => {
  req.query.type = "all";
  return router.handle(req, res);
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
    res.status(500).json({ 
      error: "Failed to fetch trending content",
      code: "TRENDING_ERROR"
    });
  }
});

export default router;
