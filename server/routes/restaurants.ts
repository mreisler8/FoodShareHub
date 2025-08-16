import { Router } from "express";
import { authenticate } from "../auth";
import { db } from "../db";
import { restaurants, posts, users, userFollowers, likes, comments, restaurantLists, restaurantListItems } from "../../shared/schema";
import { eq, and, desc, sql, inArray, or, ilike } from "drizzle-orm";
import { getPlaceDetails } from "../services/google-places";

const router = Router();

// Serve Google Places photos securely
router.get("/photo/:photoReference", async (req, res) => {
  try {
    const { photoReference } = req.params;
    const { maxwidth = "800" } = req.query;

    if (!photoReference) {
      return res.status(400).json({ error: "Photo reference is required" });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Google Maps API key not configured" });
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoReference}&key=${apiKey}`;
    
    // Redirect to the actual Google photo URL
    res.redirect(photoUrl);
  } catch (error) {
    console.error("Error serving Google Places photo:", error);
    res.status(500).json({ error: "Failed to serve photo" });
  }
});

// Get restaurant details by googlePlaceId parameter or browse all restaurants
router.get("/", authenticate, async (req, res) => {
  try {
    const { googlePlaceId, search, limit = 50 } = req.query;

    // Allow browsing all restaurants if no googlePlaceId provided
    if (!googlePlaceId) {
      try {
        let query = db.select().from(restaurants);
        
        // Add search filtering if search term provided
        if (search && typeof search === 'string') {
          const searchTerm = `%${search}%`;
          query = query.where(
            or(
              ilike(restaurants.name, searchTerm),
              ilike(restaurants.address, searchTerm),
              ilike(restaurants.city, searchTerm),
              ilike(restaurants.cuisine, searchTerm)
            )
          );
        }
        
        const allRestaurants = await query
          .orderBy(desc(restaurants.verified), restaurants.name)
          .limit(parseInt(limit as string) || 50);
        
        return res.json(allRestaurants);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        return res.status(500).json({ error: 'Failed to fetch restaurants' });
      }
    }

    if (typeof googlePlaceId !== 'string') {
      return res.status(400).json({ 
        error: "Google Place ID must be a string",
        code: "INVALID_GOOGLE_PLACE_ID"
      });
    }

    try {
      const placeDetails = await getPlaceDetails(googlePlaceId);

      if (!placeDetails) {
        return res.status(404).json({ 
          error: "Restaurant not found",
          code: "RESTAURANT_NOT_FOUND"
        });
      }

      console.log('🖼️ Place details:', {
        name: placeDetails.name,
        hasImageUrl: !!placeDetails.imageUrl,
        imageUrl: placeDetails.imageUrl,
        photoCount: placeDetails.photos?.length || 0,
        hasApiKey: !!process.env.GOOGLE_MAPS_API_KEY
      });

      // Format Google Places details to match our restaurant format - using safe property access
      const restaurantDetails = {
        id: `google_${googlePlaceId}`,
        name: placeDetails.name || 'Unknown Restaurant',
        location: placeDetails.address || 'Unknown location',
        address: placeDetails.address || '',
        phone: placeDetails.phone || null,
        website: placeDetails.website || null,
        hours: placeDetails.hours || null,
        category: placeDetails.category || 'Restaurant',
        cuisine: placeDetails.cuisine || 'Restaurant',
        priceRange: placeDetails.priceRange || '$$',
        googleRating: placeDetails.rating || 4.0, // Renamed to avoid schema conflicts
        imageUrl: placeDetails.imageUrl || null,
        description: null,
        googlePlaceId: googlePlaceId,
        source: 'google',
        googlePlaces: {
          rating: placeDetails.rating || 0,
          reviewCount: placeDetails.reviewCount || 0,
          isOpen: placeDetails.isOpen || null,
          businessStatus: placeDetails.businessStatus || 'OPERATIONAL',
          isPermanentlyClosed: placeDetails.isPermanentlyClosed || false,
          photos: placeDetails.photos || [],
          reviews: placeDetails.googleReviews || [],
          priceLevel: placeDetails.priceRange || '$$'
        },
        communityInsights: {
          followersAverageRating: null,
          followersReviewCount: 0,
          topDishes: [] as Array<{dish: string; mentions: number}>,
          recentPosts: [] as Array<any>,
          hasFollowersReviewed: false
        }
      };

      return res.json(restaurantDetails);
    } catch (googleError) {
      console.error("Error fetching Google Place details:", googleError);
      return res.status(500).json({ 
        error: "Failed to fetch restaurant details from Google",
        code: "GOOGLE_API_ERROR"
      });
    }
  } catch (error) {
    console.error("Error in restaurant lookup:", error);
    res.status(500).json({ 
      error: "Failed to fetch restaurant details",
      code: "INTERNAL_ERROR"
    });
  }
});

// Get restaurant details by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        error: "Restaurant ID is required",
        code: "MISSING_ID"
      });
    }

    // Check if it's a Google Places result
    if (id.startsWith('google_')) {
      const googlePlaceId = id.replace('google_', '');

      try {
        const placeDetails = await getPlaceDetails(googlePlaceId);

        if (!placeDetails) {
          return res.status(404).json({ 
            error: "Restaurant not found",
            code: "RESTAURANT_NOT_FOUND"
          });
        }

        // Format Google Places details to match our restaurant format - using safe property access
        const restaurantDetails = {
          id: `google_${googlePlaceId}`,
          name: placeDetails.name || 'Unknown Restaurant',
          location: placeDetails.address || 'Unknown location',
          address: placeDetails.address || '',
          phone: placeDetails.phone || null,
          website: placeDetails.website || null,
          hours: placeDetails.hours || null,
          category: placeDetails.category || 'Restaurant',
          cuisine: placeDetails.cuisine || 'Restaurant',
          priceRange: placeDetails.priceRange || '$$',
          googleRating: placeDetails.rating || 4.0, // Use googleRating to avoid schema conflicts
          imageUrl: placeDetails.imageUrl || null,
          description: null,
          googlePlaceId: googlePlaceId,
          source: 'google',
          googlePlaces: {
            rating: placeDetails.rating || 0,
            reviewCount: placeDetails.reviewCount || 0,
            isOpen: placeDetails.isOpen || null,
            businessStatus: placeDetails.businessStatus || 'OPERATIONAL',
            isPermanentlyClosed: placeDetails.isPermanentlyClosed || false,
            photos: placeDetails.photos || [],
            reviews: placeDetails.googleReviews || [],
            priceLevel: placeDetails.priceRange || '$$'
          },
          communityInsights: {
            followersAverageRating: null,
            followersReviewCount: 0,
            topDishes: [] as Array<{dish: string; mentions: number}>,
            recentPosts: [] as Array<any>,
            hasFollowersReviewed: false
          }
        };

        return res.json(restaurantDetails);
      } catch (googleError) {
        console.error("Error fetching Google Place details:", googleError);
        return res.status(500).json({ 
          error: "Failed to fetch restaurant details from Google",
          code: "GOOGLE_API_ERROR"
        });
      }
    }

    // Try to fetch from database
    const restaurantId = parseInt(id);
    if (isNaN(restaurantId)) {
      return res.status(400).json({ 
        error: "Invalid restaurant ID format",
        code: "INVALID_ID_FORMAT"
      });
    }

    const restaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!restaurant || restaurant.length === 0) {
      return res.status(404).json({ 
        error: "Restaurant not found",
        code: "RESTAURANT_NOT_FOUND"
      });
    }

    const restaurantData = restaurant[0];

    // Fetch comprehensive Google Places data if available
    let googlePlacesData = null;
    let location = restaurantData.location;
    let address = restaurantData.address || '';

    if (restaurantData.googlePlaceId) {
      try {
        console.log("Fetching comprehensive Google Places data for restaurant:", restaurantData.name);
        googlePlacesData = await getPlaceDetails(restaurantData.googlePlaceId);
        if (googlePlacesData && googlePlacesData.address) {
          location = googlePlacesData.address;
          address = googlePlacesData.address;
        }
      } catch (error) {
        console.error("Error fetching Google Places data:", error);
        // Keep existing location if Google Places fails
      }
    }

    // Get community insights - posts from users that the current user follows
    const userId = req.user?.id;
    let communityInsights = {
      followersAverageRating: null,
      followersReviewCount: 0,
      topDishes: [],
      recentPosts: [],
      hasFollowersReviewed: false,
    };

    if (userId) {
      try {
        // Get followers of the current user
        const following = await db
          .select({ followingId: userFollowers.followingId })
          .from(userFollowers)
          .where(eq(userFollowers.followerId, userId));

        const followingIds = following.map(f => f.followingId);

        if (followingIds.length > 0) {
          // Get posts from followed users about this restaurant
          const followerPosts = await db
            .select({
              id: posts.id,
              content: posts.content,
              rating: posts.rating,
              dishesTried: posts.dishesTried,
              images: posts.images,
              createdAt: posts.createdAt,
              priceAssessment: posts.priceAssessment,
              atmosphere: posts.atmosphere,
              serviceRating: posts.serviceRating,
              dietaryOptions: posts.dietaryOptions,
              authorId: posts.userId,
              authorName: users.name,
              authorUsername: users.username,
              likeCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`,
              commentCount: sql<number>`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.postId} = ${posts.id})`,
            })
            .from(posts)
            .innerJoin(users, eq(users.id, posts.userId))
            .where(and(
              eq(posts.restaurantId, restaurantId),
              inArray(posts.userId, followingIds)
            ))
            .orderBy(desc(posts.createdAt))
            .limit(5);

          if (followerPosts.length > 0) {
            // Calculate average rating from followers
            const totalRating = followerPosts.reduce((sum, post) => sum + post.rating, 0);
            const averageRating = totalRating / followerPosts.length;

            // Extract top dishes mentioned
            const allDishes = followerPosts
              .flatMap(post => post.dishesTried || [])
              .filter(dish => dish && dish.trim().length > 0);

            const dishCounts = allDishes.reduce((acc, dish) => {
              acc[dish] = (acc[dish] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const topDishes = Object.entries(dishCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([dish, count]) => ({ dish, mentions: count }));

            communityInsights = {
              followersAverageRating: Math.round(averageRating * 10) / 10,
              followersReviewCount: followerPosts.length,
              topDishes,
              recentPosts: followerPosts.map(post => ({
                id: post.id,
                content: post.content,
                rating: post.rating,
                dishesTried: post.dishesTried,
                images: post.images,
                createdAt: post.createdAt,
                priceAssessment: post.priceAssessment,
                atmosphere: post.atmosphere,
                serviceRating: post.serviceRating,
                dietaryOptions: post.dietaryOptions,
                author: {
                  id: post.authorId,
                  name: post.authorName,
                  username: post.authorUsername,
                },
                likeCount: parseInt(post.likeCount.toString()),
                commentCount: parseInt(post.commentCount.toString()),
              })),
              hasFollowersReviewed: true,
            };
          }
        }
      } catch (error) {
        console.error("Error fetching community insights:", error);
        // Keep default empty insights if community data fails
      }
    }

    // Format database restaurant to match our detail format with Google Places and community data
    const restaurantDetails = {
      id: restaurantData.id.toString(),
      name: restaurantData.name,
      location: location,
      address: address,
      phone: googlePlacesData?.phone || restaurantData.phone || null,
      website: googlePlacesData?.website || restaurantData.website || null,
      hours: googlePlacesData?.hours || restaurantData.hours || null,
      category: restaurantData.category,
      cuisine: restaurantData.cuisine || restaurantData.category,
      priceRange: googlePlacesData?.priceRange || restaurantData.priceRange,
      googleRating: googlePlacesData?.rating || 4.0, // Use googleRating to avoid schema conflicts
      imageUrl: googlePlacesData?.imageUrl || restaurantData.imageUrl || null,
      description: googlePlacesData?.description || restaurantData.description || null,
      googlePlaceId: restaurantData.googlePlaceId || null,
      source: 'database',
      // Enhanced Google Places data
      googlePlaces: googlePlacesData ? {
        rating: googlePlacesData.rating || 0,
        reviewCount: googlePlacesData.reviewCount || 0,
        isOpen: googlePlacesData.isOpen || null,
        businessStatus: googlePlacesData.businessStatus,
        isPermanentlyClosed: googlePlacesData.isPermanentlyClosed || false,
        photos: googlePlacesData.photos || [],
        reviews: googlePlacesData.googleReviews || [],
        priceLevel: googlePlacesData.priceRange,
      } : null,
      // Community insights
      communityInsights,
    };

    res.json(restaurantDetails);

  } catch (error) {
    console.error("Error fetching restaurant details:", error);
    res.status(500).json({ 
      error: "Failed to fetch restaurant details",
      code: "INTERNAL_ERROR"
    });
  }
});

// Get lists that mention a specific restaurant
router.get("/:id/lists", authenticate, async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(restaurantId)) {
      return res.status(400).json({ error: "Invalid restaurant ID" });
    }

    // Get lists that contain this restaurant
    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        itemCount: sql<number>`COUNT(${restaurantListItems.id})`.as('itemCount'),
        isPublic: restaurantLists.makePublic,
        ranking: restaurantListItems.position,
        tags: restaurantLists.tags,
        createdAt: restaurantLists.createdAt,
        owner: {
          id: users.id,
          name: users.name,
          username: users.username
        }
      })
      .from(restaurantListItems)
      .innerJoin(restaurantLists, eq(restaurantListItems.listId, restaurantLists.id))
      .innerJoin(users, eq(restaurantLists.createdById, users.id))
      .where(eq(restaurantListItems.restaurantId, restaurantId))
      .groupBy(
        restaurantLists.id, restaurantLists.name, restaurantLists.description,
        restaurantLists.makePublic, restaurantListItems.position, restaurantLists.tags,
        restaurantLists.createdAt, users.id, users.name, users.username
      )
      .limit(10);

    res.json(lists);
  } catch (error) {
    console.error('Error fetching restaurant lists:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant lists' });
  }
});

// Get posts that mention a specific restaurant
router.get("/:id/posts", authenticate, async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(restaurantId)) {
      return res.status(400).json({ error: "Invalid restaurant ID" });
    }

    // Get recent posts for this restaurant
    const restaurantPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        dishesTried: posts.dishesTried,
        images: posts.images,
        createdAt: posts.createdAt,
        priceAssessment: posts.priceAssessment,
        atmosphere: posts.atmosphere,
        serviceRating: posts.serviceRating,
        dietaryOptions: posts.dietaryOptions,
        author: {
          id: users.id,
          name: users.name,
          username: users.username
        },
        likeCount: sql<number>`COUNT(DISTINCT ${likes.id})`.as('likeCount'),
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`.as('commentCount')
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .leftJoin(likes, eq(posts.id, likes.postId))
      .leftJoin(comments, eq(posts.id, comments.postId))
      .where(eq(posts.restaurantId, restaurantId))
      .groupBy(
        posts.id, posts.content, posts.rating, posts.dishesTried, posts.images,
        posts.createdAt, posts.priceAssessment, posts.atmosphere, posts.serviceRating,
        posts.dietaryOptions, users.id, users.name, users.username
      )
      .orderBy(desc(posts.createdAt))
      .limit(10);

    res.json(restaurantPosts);
  } catch (error) {
    console.error('Error fetching restaurant posts:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant posts' });
  }
});

export default router;