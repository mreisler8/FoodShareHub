import { Router } from "express";
import { authenticate } from "../auth";
import { db } from "../db";
import { restaurants, restaurantLists, posts, users, userFollowers, circleMembers } from "../../shared/schema";
import { eq, and, or, like, desc, sql, ilike, ne, inArray } from "drizzle-orm";
import { searchGooglePlaces, getPlaceDetails } from "../services/google-places";
import { EnhancedSearchEngine } from "../services/search-engine";
import { z } from "zod";

const router = Router();

// Enhanced input validation schemas
const searchQuerySchema = z.object({
  q: z.string().min(2).max(100).trim(),
  type: z.enum(['all', 'restaurants', 'lists', 'posts', 'users']).default('all'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(100).max(50000).optional()
});

// Enhanced privacy service for search
class SearchPrivacyService {
  static async getAccessibleLists(userId: number, searchPattern: string, limit: number = 5) {
    try {
      // Validate user ID
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        throw new Error('Invalid user ID');
      }

      // Use parameterized query to prevent SQL injection and ensure proper privacy filtering
      const listResults = await db.execute(sql`
        SELECT DISTINCT 
          rl.id, rl.name, rl.description, rl.tags, rl.created_by_id as "createdById",
          rl.is_public as "isPublic", rl.view_count as "viewCount", rl.created_at as "createdAt",
          rl.make_public as "makePublic", rl.share_with_circle as "shareWithCircle"
        FROM restaurant_lists rl
        LEFT JOIN circle_members cm ON rl.circle_id = cm.circle_id AND cm.user_id = ${userId} AND cm.status = 'active'
        WHERE (
          -- Search criteria
          (rl.name ILIKE ${searchPattern} OR COALESCE(rl.description, '') ILIKE ${searchPattern})
        ) AND (
          -- Privacy filtering
          rl.created_by_id = ${userId} OR -- User owns the list
          (rl.make_public = true AND rl.is_public = true) OR -- List is fully public
          (rl.share_with_circle = true AND cm.user_id = ${userId}) -- List is shared with user's circle
        )
        ORDER BY 
          CASE WHEN rl.created_by_id = ${userId} THEN 0 ELSE 1 END,
          rl.created_at DESC
        LIMIT ${limit}
      `);

      return listResults.rows.map((l: any) => ({
        id: l.id.toString(),
        name: l.name,
        subtitle: l.description || `${l.tags?.length || 0} tags`,
        type: 'list' as const,
        createdById: l.createdById,
        viewCount: l.viewCount
      }));
    } catch (error) {
      console.error('Error fetching accessible lists:', error);
      return [];
    }
  }

  static async getAccessibleUsers(userId: number, searchPattern: string, limit: number = 5) {
    try {
      // Validate user ID
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        throw new Error('Invalid user ID');
      }

      // Get users with privacy-aware search
      const userResults = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          bio: users.bio,
          profilePicture: users.profilePicture,
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
            ne(users.id, userId) // Exclude current user
          )
        )
        .limit(limit);

      // Batch fetch social metadata for performance
      const userIds = userResults.map(u => u.id);

      // Get follow status in batch
      const followStatusResults = await db
        .select({
          followingId: userFollowers.followingId,
          status: userFollowers.status
        })
        .from(userFollowers)
        .where(
          and(
            eq(userFollowers.followerId, userId),
            inArray(userFollowers.followingId, userIds)
          )
        );

      const followStatusMap = new Map(
        followStatusResults.map(fs => [fs.followingId, fs.status])
      );

      // Get mutual connections in batch
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
              WHERE follower_id = ${userId}
            )`
          )
        )
        .groupBy(userFollowers.followerId);

      const mutualConnectionsMap = new Map(
        mutualConnectionsResults.map(mc => [mc.userId, mc.count])
      );

      return userResults.map(user => ({
        id: user.id.toString(),
        name: user.name,
        subtitle: `@${user.username}${user.bio ? ` • ${user.bio.substring(0, 30)}...` : ''}`,
        avatar: user.profilePicture,
        diningInterests: user.diningInterests || [],
        preferredCuisines: user.preferredCuisines || [],
        preferredLocation: user.preferredLocation,
        isFollowing: followStatusMap.has(user.id),
        mutualConnections: mutualConnectionsMap.get(user.id) || 0,
        type: 'user' as const
      }));
    } catch (error) {
      console.error('Error fetching accessible users:', error);
      return [];
    }
  }
}

// Location caching service for performance
class LocationCacheService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async getLocationDetails(googlePlaceId: string): Promise<any> {
    const cacheKey = `location_${googlePlaceId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const placeDetails = await getPlaceDetails(googlePlaceId);
      if (placeDetails) {
        this.cache.set(cacheKey, { data: placeDetails, timestamp: Date.now() });
      }
      return placeDetails;
    } catch (error) {
      console.error('Error fetching location details:', error);
      return null;
    }
  }

  static clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

// Clear cache periodically
setInterval(() => {
  LocationCacheService.clearExpiredCache();
}, 5 * 60 * 1000); // Every 5 minutes

// Enhanced unified search endpoint
router.get("/", authenticate, async (req, res) => {
  try {
    // Enhanced input validation
    const validatedQuery = searchQuerySchema.parse({
      q: req.query.q,
      type: req.query.type || 'all',
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radius: req.query.radius ? parseInt(req.query.radius as string) : undefined
    });

    const { q: searchTerm, type, lat, lng, radius } = validatedQuery;
    const userId = req.user!.id;
    
    // Prepare search filters
    const filters = {
      location: req.query.location as string,
      lat,
      lng,
      radius,
      priceRange: req.query.priceRange as string,
      cuisine: req.query.cuisine as string,
      category: req.query.category as string
    };

    // Use enhanced search engine for all content types
    if (type === "all") {
      const searchResults = await EnhancedSearchEngine.unifiedSearch(
        searchTerm,
        userId,
        filters,
        { restaurants: 10, lists: 5, users: 5, posts: 5 }
      );
      
      // Format results for compatibility
      const formattedResults = {
        restaurants: searchResults.restaurants.map(r => ({
          ...r,
          avgRating: 4.2,
          source: 'database' as const
        })),
        lists: searchResults.lists,
        users: searchResults.users,
        posts: searchResults.posts
      };

      return res.json(formattedResults);
    }

    // Search restaurants with enhanced engine
    if (type === "restaurants") {
      const restaurantResults = await EnhancedSearchEngine.searchRestaurants(
        searchTerm,
        userId,
        filters,
        15
      );

      // Enhance with Google Places if needed
      if (restaurantResults.length < 10) {
        try {
          const locationData = (lat && lng) ? { lat, lng, radius } : undefined;
          const googleResults = await searchGooglePlaces(searchTerm, locationData);

          const filteredGoogleResults = googleResults.filter(
            (gr) => !restaurantResults.some((dr) => dr.id === gr.googlePlaceId)
          );

          const formattedGoogleResults = filteredGoogleResults.slice(0, 10 - restaurantResults.length).map(r => ({
            id: `google_${r.googlePlaceId}`,
            name: r.name,
            thumbnailUrl: r.imageUrl,
            avgRating: typeof r.rating === 'number' && !isNaN(r.rating) ? r.rating : 4.2,
            location: r.location,
            category: r.category,
            priceRange: r.priceRange,
            cuisine: r.cuisine,
            address: r.address,
            source: 'google' as const,
            type: 'restaurant' as const,
            googlePlaceId: r.googlePlaceId,
            relevanceScore: 50 // Lower than database results
          }));

          restaurantResults.push(...formattedGoogleResults);
        } catch (googleError) {
          console.error("Google Places search error:", googleError);
        }
      }

      return res.json(restaurantResults.map(r => ({
        ...r,
        avgRating: r.metadata?.avgRating || 4.2,
        source: r.id.startsWith('google_') ? 'google' : 'database'
      })));
    }

    // Search lists with enhanced engine
    if (type === "lists") {
      const listResults = await EnhancedSearchEngine.searchLists(searchTerm, userId, 10);
      return res.json(listResults);
    }

    // Search users with enhanced engine
    if (type === "users") {
      const userResults = await EnhancedSearchEngine.searchUsers(searchTerm, userId, 10);
      return res.json(userResults);
    }

    // Search posts with enhanced engine
    if (type === "posts") {
      const postResults = await EnhancedSearchEngine.searchPosts(searchTerm, userId, 10);
      return res.json(postResults);
    }

    // Return results based on search type
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

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid search parameters",
        details: error.errors,
        code: "INVALID_INPUT"
      });
    }

    res.status(500).json({ 
      error: "Search failed. Please try again.",
      code: "SEARCH_ERROR"
    });
  }
});

// Restaurant-specific search endpoint for backward compatibility
router.get("/restaurants", authenticate, async (req, res) => {
  // Forward to main search with restaurants filter
  req.query.type = "restaurants";
  return router.handle(req, res);
});

// Unified search endpoint (alias for backward compatibility)
router.get("/unified", authenticate, async (req, res) => {
  // Forward to main search with type='all'
  req.query.type = 'all';
  return router.handle(req, res);
});

    const filteredGoogleResults = googleResults.filter(
      (gr) => !formattedRestaurants.some((dr) => dr.id === gr.googlePlaceId)
    );

    const formattedGoogleResults = filteredGoogleResults.slice(0, 5 - formattedRestaurants.length).map(r => ({
      id: `google_${r.googlePlaceId}`,
      name: r.name,
      thumbnailUrl: r.imageUrl,
      avgRating: typeof r.rating === 'number' && !isNaN(r.rating) ? r.rating : 4.2,
      location: r.location,
      category: r.category,
      priceRange: r.priceRange,
      cuisine: r.cuisine,
      address: r.address,
      source: 'google' as const,
      type: 'restaurant' as const,
      googlePlaceId: r.googlePlaceId
    }));

    const restaurantsResult = [...formattedRestaurants, ...formattedGoogleResults];

    // Enhanced privacy-aware list search
    const listResults = await SearchPrivacyService.getAccessibleLists(userId, searchPattern);

    // Enhanced privacy-aware user search
    const userResults = await SearchPrivacyService.getAccessibleUsers(userId, searchPattern);

    // Enhanced post search with privacy filtering
    const postResults = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        userId: posts.userId,
        restaurantId: posts.restaurantId,
        createdAt: posts.createdAt,
        visibility: posts.visibility
      })
      .from(posts)
      .where(
        and(
          ilike(posts.content, searchPattern),
          // Only include posts user can see
          or(
            eq(posts.userId, userId), // User's own posts
            sql`${posts.visibility}->>'public' = 'true'` // Public posts
          )
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

    const result = {
      restaurants: restaurantsResult,
      lists: listResults,
      posts: formattedPosts,
      users: userResults
    };

    res.json(result);

  } catch (error) {
    console.error("Unified search error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid search parameters",
        details: error.errors,
        code: "INVALID_INPUT"
      });
    }

    res.status(500).json({
      error: "Search failed. Please try again.",
      code: "SEARCH_ERROR"
    });
  }
});

// Enhanced trending endpoint with location support
router.get("/trending", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Validate location parameters
    const locationSchema = z.object({
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      radius: z.number().min(100).max(50000).optional()
    });

    const { lat, lng, radius } = locationSchema.parse({
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radius: req.query.radius ? parseInt(req.query.radius as string) : undefined
    });

    const locationData = (lat && lng) ? { lat, lng, radius } : undefined;

    let trendingRestaurants = [];

    // Enhanced trending restaurants with location support
    if (locationData) {
      try {
        const popularRestaurants = await searchGooglePlaces("restaurant", locationData);
        trendingRestaurants = popularRestaurants.slice(0, 8).map(r => ({
          id: `google_${r.googlePlaceId}`,
          name: r.name,
          location: r.location,
          category: r.category,
          type: 'restaurant' as const,
          thumbnailUrl: r.imageUrl,
          avgRating: typeof r.rating === 'number' && !isNaN(r.rating) ? r.rating : 4.2,
          priceRange: r.priceRange,
          cuisine: r.cuisine,
          address: r.address,
          source: 'google' as const,
          googlePlaceId: r.googlePlaceId
        }));
      } catch (googleError) {
        console.error("Error getting location-based trending restaurants:", googleError);
        // Fallback to database restaurants
        const dbRestaurants = await db
          .select({
            id: restaurants.id,
            name: restaurants.name,
            location: restaurants.location,
            category: restaurants.category,
            cuisine: restaurants.cuisine,
            priceRange: restaurants.priceRange,
            imageUrl: restaurants.imageUrl
          })
          .from(restaurants)
          .limit(5);

        trendingRestaurants = dbRestaurants.map(r => ({
          id: r.id.toString(),
          name: r.name,
          location: r.location,
          category: r.category,
          type: 'restaurant' as const,
          thumbnailUrl: r.imageUrl,
          avgRating: 4.2,
          priceRange: r.priceRange,
          cuisine: r.cuisine,
          address: r.location,
          source: 'database' as const
        }));
      }
    }

    // Get trending lists with privacy filtering
    const trendingLists = await SearchPrivacyService.getAccessibleLists(userId, '%%', 2);

    res.json({
      trending: [...trendingRestaurants, ...trendingLists]
    });

  } catch (error) {
    console.error("Trending search error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid location parameters",
        details: error.errors,
        code: "INVALID_LOCATION"
      });
    }

    res.status(500).json({ 
      error: "Failed to fetch trending content",
      code: "TRENDING_ERROR"
    });
  }
});

export default router;