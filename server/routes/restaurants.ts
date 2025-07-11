import { Router } from "express";
import { authenticate } from "../auth";
import { db } from "../db";
import { restaurants, posts, users, userFollowers, likes, comments } from "../../shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getPlaceDetails } from "../services/google-places";

const router = Router();

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

        // Format Google Places details to match our restaurant format
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
          rating: placeDetails.rating || 4.0,
          imageUrl: null,
          description: null,
          googlePlaceId: googlePlaceId,
          source: 'google',
          googlePlaces: {
            rating: placeDetails.rating || 0,
            reviewCount: placeDetails.reviewCount || 0,
            isOpen: placeDetails.isOpen,
            businessStatus: placeDetails.businessStatus || 'OPERATIONAL',
            isPermanentlyClosed: placeDetails.isPermanentlyClosed || false,
            photos: placeDetails.photos || [],
            reviews: placeDetails.googleReviews || [],
            priceLevel: placeDetails.priceRange || '$$'
          },
          communityInsights: {
            followersAverageRating: null,
            followersReviewCount: 0,
            topDishes: [],
            recentPosts: [],
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
      rating: googlePlacesData?.rating || restaurantData.rating || 4.0,
      imageUrl: restaurantData.imageUrl || null,
      description: googlePlacesData?.description || restaurantData.description || null,
      googlePlaceId: restaurantData.googlePlaceId || null,
      source: 'database',
      // Enhanced Google Places data
      googlePlaces: googlePlacesData ? {
        rating: googlePlacesData.rating || 0,
        reviewCount: googlePlacesData.reviewCount || 0,
        isOpen: googlePlacesData.isOpen,
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

export default router;