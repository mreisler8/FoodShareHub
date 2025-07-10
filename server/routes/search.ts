
import { Router } from "express";
import { authenticate } from "../auth";
import { db } from "../db";
import { restaurants, restaurantLists, posts, users } from "../../shared/schema";
import { eq, and, or, like, desc, sql, ilike } from "drizzle-orm";
import { searchGooglePlaces, getPlaceDetails } from "../services/google-places";

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
      try {
        // First get restaurants from database
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
            googlePlaceId: restaurants.googlePlaceId,
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
        
        console.log('Database search results:', restaurantResults.length, 'restaurants found');
        
        // Transform to unified format with proper rating calculation and location fetching
        const formattedRestaurants = await Promise.all(restaurantResults.map(async (r) => {
          let location = r.location;
          
          console.log('Processing restaurant:', r.name, 'with location:', location, 'googlePlaceId:', r.googlePlaceId);
          
          // If location is unknown but we have a Google Place ID, fetch the location
          if ((!location || location === 'Unknown location') && r.googlePlaceId) {
            try {
              console.log('Fetching location for restaurant:', r.name, 'with place ID:', r.googlePlaceId);
              const placeDetails = await getPlaceDetails(r.googlePlaceId);
              if (placeDetails && placeDetails.address) {
                location = placeDetails.address;
                console.log('Updated location for restaurant:', r.name, 'to:', location);
              } else {
                console.log('No address found in place details for restaurant:', r.name);
              }
            } catch (error) {
              console.error('Error fetching location for restaurant:', r.name, error);
              // Keep the existing location if Google Places fails
            }
          } else {
            console.log('Skipping location fetch for restaurant:', r.name, 'location:', location, 'googlePlaceId:', r.googlePlaceId);
          }
          
          return {
            id: r.id.toString(),
            name: r.name,
            thumbnailUrl: r.imageUrl,
            avgRating: 4.2, // Default rating as number - should be calculated from actual ratings
            location: location,
            category: r.category,
            priceRange: r.priceRange,
            cuisine: r.cuisine,
            address: r.address,
            source: 'database' as const,
            type: 'restaurant' as const
          };
        }));
        
        results.push(...formattedRestaurants);
        
        console.log(`Database returned ${formattedRestaurants.length} restaurants for query "${searchTerm}"`);
        
        // If local results are limited, search Google Places API for restaurants
        if (formattedRestaurants.length < 5) {
          try {
            // Parse location from request if provided
            const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
            const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
            const radius = req.query.radius ? parseInt(req.query.radius as string) : undefined;
            
            const locationData = (lat && lng) ? { lat, lng, radius } : undefined;
            
            console.log('Request query params:', req.query);
            console.log('Parsed location values:', { lat, lng, radius });
            console.log('Location data object:', locationData);
            console.log(`Searching Google Places for: "${searchTerm}"${locationData ? ` near ${lat}, ${lng}` : ''}`);
            
            const googleResults = await searchGooglePlaces(searchTerm, locationData);
            console.log(`Google Places returned ${googleResults.length} results`);
            
            // Filter out Google results that already exist in the database
            const filteredGoogleResults = googleResults.filter(
              (gr) => !formattedRestaurants.some((dr) => dr.id === gr.googlePlaceId)
            );
            
            // Transform Google results to match our format
            const formattedGoogleResults = filteredGoogleResults.slice(0, 5 - formattedRestaurants.length).map(r => ({
              id: `google_${r.googlePlaceId}`,
              name: r.name,
              thumbnailUrl: r.imageUrl,
              avgRating: typeof r.rating === 'number' && !isNaN(r.rating) ? r.rating : 4.2, // Use actual Google rating with validation
              location: r.location,
              category: r.category,
              priceRange: r.priceRange,
              cuisine: r.cuisine,
              address: r.address,
              source: 'google' as const,
              type: 'restaurant' as const,
              googlePlaceId: r.googlePlaceId
            }));
            
            results.push(...formattedGoogleResults);
          } catch (googleError) {
            console.error("Google Places search error:", googleError);
            // Continue without Google results - this allows search to work even if Google API fails
          }
        }
      } catch (dbError) {
        console.error("Database restaurant search error:", dbError);
      }
    }
    
    // Search lists
    if (type === "all" || type === "lists") {
      try {
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
      } catch (dbError) {
        console.error("Database list search error:", dbError);
      }
    }
    
    // Search posts
    if (type === "all" || type === "posts") {
      try {
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
          .where(ilike(posts.content, searchPattern))
          .orderBy(desc(posts.createdAt))
          .limit(5);
        
        const formattedPosts = postResults.map(p => ({
          id: p.id.toString(),
          name: p.content.substring(0, 50) + '...',
          subtitle: `${p.rating} stars`,
          type: 'post' as const
        }));
        
        results.push(...formattedPosts);
      } catch (dbError) {
        console.error("Database post search error:", dbError);
      }
    }
    
    // Search users
    if (type === "all" || type === "users") {
      try {
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
      } catch (dbError) {
        console.error("Database user search error:", dbError);
      }
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
    
    console.log(`Search for "${searchTerm}" returned:`, {
      restaurants: grouped.restaurants.length,
      lists: grouped.lists.length,
      posts: grouped.posts.length,
      users: grouped.users.length
    });
    
    res.json(grouped);
    
  } catch (error) {
    console.error("Search error:", error);
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
  try {
    const { q } = req.query;
    
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
    
    // Search restaurants (including Google Places)
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
        googlePlaceId: restaurants.googlePlaceId,
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
    
    console.log(`Unified search: Database returned ${restaurantResults.length} restaurants for query "${searchTerm}"`);
    
    let formattedRestaurants = restaurantResults.map(r => ({
      id: r.id.toString(),
      name: r.name,
      thumbnailUrl: r.imageUrl,
      avgRating: 4.2,
      location: r.location,
      category: r.category,
      priceRange: r.priceRange,
      cuisine: r.cuisine,
      address: r.address,
      source: 'database' as const,
      type: 'restaurant' as const
    }));
    
    // If local results are limited, search Google Places API for restaurants
    if (formattedRestaurants.length < 5) {
      try {
        // Parse location from request if provided
        const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
        const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
        const radius = req.query.radius ? parseInt(req.query.radius as string) : undefined;
        
        const locationData = (lat && lng) ? { lat, lng, radius } : undefined;
        
        console.log('Unified search: Request query params:', req.query);
        console.log('Unified search: Parsed location values:', { lat, lng, radius });
        console.log('Unified search: Location data object:', locationData);
        console.log(`Unified search: Searching Google Places for: "${searchTerm}"${locationData ? ` near ${lat}, ${lng}` : ''}`);
        
        const googleResults = await searchGooglePlaces(searchTerm, locationData);
        console.log(`Unified search: Google Places returned ${googleResults.length} results`);
        
        // Filter out Google results that already exist in the database
        const filteredGoogleResults = googleResults.filter(
          (gr) => !formattedRestaurants.some((dr) => dr.id === gr.googlePlaceId)
        );
        
        // Transform Google results to match our format
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
        
        formattedRestaurants = [...formattedRestaurants, ...formattedGoogleResults];
      } catch (googleError) {
        console.error("Unified search: Google Places search error:", googleError);
      }
    }
    
    // Add Google Places results if needed
    if (formattedRestaurants.length < 5) {
      try {
        const googleResults = await searchGooglePlaces(searchTerm);
        const filteredGoogleResults = googleResults.filter(
          (gr) => !formattedRestaurants.some((dr) => dr.name.toLowerCase() === gr.name.toLowerCase())
        );
        
        const formattedGoogleResults = filteredGoogleResults.slice(0, 5 - formattedRestaurants.length).map(r => ({
          id: `google_${r.googlePlaceId}`,
          name: r.name,
          thumbnailUrl: r.imageUrl,
          avgRating: 4.2,
          location: r.location,
          category: r.category,
          priceRange: r.priceRange,
          cuisine: r.cuisine,
          address: r.address,
          source: 'google' as const,
          type: 'restaurant' as const,
          googlePlaceId: r.googlePlaceId
        }));
        
        formattedRestaurants = [...formattedRestaurants, ...formattedGoogleResults];
      } catch (googleError) {
        console.error("Google Places search error:", googleError);
      }
    }
    
    // Search other content types
    const listResults = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
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
      subtitle: l.description || '',
      type: 'list' as const
    }));
    
    const result = {
      restaurants: formattedRestaurants,
      lists: formattedLists,
      posts: [],
      users: []
    };
    
    res.json(result);
    
  } catch (error) {
    console.error("Unified search error:", error);
    res.status(500).json({ 
      error: "Search failed. Please try again.",
      code: "SEARCH_ERROR"
    });
  }
});

// Get trending content for search modal
router.get("/trending", authenticate, async (req, res) => {
  try {
    // Parse location from request if provided
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const radius = req.query.radius ? parseInt(req.query.radius as string) : undefined;
    
    const locationData = (lat && lng) ? { lat, lng, radius } : undefined;
    
    console.log('Trending request with location:', locationData);
    
    let trendingRestaurants = [];
    
    // If location is provided, get trending restaurants near the user
    if (locationData) {
      try {
        console.log(`Getting trending restaurants near ${lat}, ${lng}`);
        // Use Google Places to find popular restaurants in the area (use generic restaurant search)
        const popularRestaurants = await searchGooglePlaces("restaurant", locationData);
        console.log(`Google Places returned ${popularRestaurants.length} popular restaurants`);
        
        // Transform to our format
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
        // Fall back to database restaurants
        const dbRestaurants = await db
          .select({
            id: restaurants.id,
            name: restaurants.name,
            location: restaurants.location,
            category: restaurants.category,
            type: sql<string>`'restaurant'`.as('type')
          })
          .from(restaurants)
          .limit(3);
        
        trendingRestaurants = dbRestaurants.map(r => ({
          ...r,
          type: 'restaurant' as const
        }));
      }
    } else {
      // No location provided, use database restaurants
      const dbRestaurants = await db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          category: restaurants.category,
          type: sql<string>`'restaurant'`.as('type')
        })
        .from(restaurants)
        .limit(3);
      
      trendingRestaurants = dbRestaurants.map(r => ({
        ...r,
        type: 'restaurant' as const
      }));
    }
    
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
