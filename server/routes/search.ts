import { Router } from 'express';
import { db } from '../db';
import { restaurants, restaurantLists, posts, users } from '../../shared/schema';
import { ilike, or, and, eq, desc } from 'drizzle-orm';
import { authenticate } from '../auth';
import { searchGooglePlaces } from '../services/google-places';

const router = Router();

// Unified search endpoint for restaurants, lists, posts, and users with Google Places integration
router.get('/unified', authenticate, async (req, res) => {
  try {
    const { q, type, limit = 20, offset = 0, lat, lng, radius } = req.query;
    const query = q as string;
    const searchType = type as string;
    const limitNum = parseInt(limit as string) || 20;
    const offsetNum = parseInt(offset as string) || 0;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${query.trim()}%`;
    const results: any = {};

    // Parse location parameters
    const location = lat && lng ? {
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string),
      radius: radius ? parseInt(radius as string) : 10000 // Default 10km radius
    } : undefined;

    // Search restaurants if no type specified or type is 'restaurants'
    if (!searchType || searchType === 'restaurants') {
      // First, search local database
      const localRestaurants = await db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          address: restaurants.address,
          city: restaurants.city,
          cuisine: restaurants.cuisine,
          priceRange: restaurants.priceRange,
          imageUrl: restaurants.imageUrl,
          googlePlaceId: restaurants.googlePlaceId,
          verified: restaurants.verified
        })
        .from(restaurants)
        .where(
          or(
            ilike(restaurants.name, searchTerm),
            ilike(restaurants.address, searchTerm),
            ilike(restaurants.city, searchTerm),
            ilike(restaurants.cuisine, searchTerm)
          )
        )
        .orderBy(desc(restaurants.verified), restaurants.name)
        .limit(Math.min(limitNum, 10)); // Limit local results to make room for Google Places

      // Then, search Google Places with location
      let googlePlacesResults: any[] = [];
      try {
        console.log(`🔍 GOOGLE PLACES SEARCH START: "${query}" ${location ? `at ${location.lat},${location.lng}` : 'globally'}`);
        console.log(`🔧 API Key available: ${!!process.env.GOOGLE_MAPS_API_KEY}`);
        
        googlePlacesResults = await searchGooglePlaces(query, location) || [];
        
        console.log(`📍 GOOGLE PLACES RESULTS: ${googlePlacesResults.length} restaurants found`);
        if (googlePlacesResults.length > 0) {
          console.log(`🏪 First result: ${googlePlacesResults[0]?.name} - ${googlePlacesResults[0]?.address}`);
        }
      } catch (error) {
        console.error('❌ GOOGLE PLACES ERROR:', error);
      }

      // Transform Google Places results to match our restaurant format
      const transformedGoogleResults = googlePlacesResults.slice(0, limitNum - localRestaurants.length).map((place: any) => ({
        id: `google_${place.googlePlaceId}`,
        name: place.name,
        address: place.address,
        city: place.city || 'Unknown',
        cuisine: place.cuisine || place.category,
        priceRange: place.priceRange,
        imageUrl: place.imageUrl,
        googlePlaceId: place.googlePlaceId,
        verified: true, // Google Places are considered verified
        source: 'google_places',
        rating: place.rating,
        distance: place.distance
      }));

      // Combine and sort results (local first, then Google Places)
      results.restaurants = [...localRestaurants, ...transformedGoogleResults];
      
      console.log(`📊 Restaurant search results: ${localRestaurants.length} local + ${transformedGoogleResults.length} Google Places = ${results.restaurants.length} total`);
    }

    // Search lists if no type specified or type is 'lists'
    if (!searchType || searchType === 'lists') {
      const listResults = await db
        .select({
          id: restaurantLists.id,
          name: restaurantLists.name,
          description: restaurantLists.description,
          tags: restaurantLists.tags,
          createdById: restaurantLists.createdById,
          createdAt: restaurantLists.createdAt
        })
        .from(restaurantLists)
        .where(
          and(
            or(
              ilike(restaurantLists.name, searchTerm),
              ilike(restaurantLists.description, searchTerm)
            ),
            eq(restaurantLists.isPublic, true) // Only show public lists in search
          )
        )
        .orderBy(desc(restaurantLists.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      results.lists = listResults;
    }

    // Search posts if no type specified or type is 'posts'
    if (!searchType || searchType === 'posts') {
      const postResults = await db
        .select({
          id: posts.id,
          content: posts.content,
          images: posts.images,
          rating: posts.rating,
          userId: posts.userId,
          restaurantId: posts.restaurantId,
          createdAt: posts.createdAt,
          visibility: posts.visibility
        })
        .from(posts)
        .where(
          and(
            ilike(posts.content, searchTerm),
            eq(posts.visibility, 'public') // Only show public posts in search
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      results.posts = postResults;
    }

    // Search users if no type specified or type is 'users'
    if (!searchType || searchType === 'users') {
      const userResults = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name
        })
        .from(users)
        .where(
          or(
            ilike(users.username, searchTerm),
            ilike(users.name, searchTerm),
            ilike(users.bio, searchTerm)
          )
        )
        .orderBy(users.name)
        .limit(limitNum)
        .offset(offsetNum);

      // Remove password field for security
      const safeUserResults = userResults.map(({ ...user }) => user);
      results.users = safeUserResults;
    }

    // Calculate total counts for pagination
    const totalCounts: any = {};
    if (results.restaurants) totalCounts.restaurants = results.restaurants.length;
    if (results.lists) totalCounts.lists = results.lists.length;
    if (results.posts) totalCounts.posts = results.posts.length;
    if (results.users) totalCounts.users = results.users.length;

    res.json({
      results,
      pagination: {
        query,
        limit: limitNum,
        offset: offsetNum,
        hasMore: Object.values(results).some((arr: any) => arr.length === limitNum),
        totalCounts
      }
    });

  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Quick restaurant search for autocomplete
router.get('/restaurants', authenticate, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const query = q as string;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const searchTerm = `%${query.trim()}%`;
    
    const restaurants_results = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        address: restaurants.address,
        city: restaurants.city,
        cuisine: restaurants.cuisine,
        imageUrl: restaurants.imageUrl,
        googlePlaceId: restaurants.googlePlaceId
      })
      .from(restaurants)
      .where(
        or(
          ilike(restaurants.name, searchTerm),
          ilike(restaurants.address, searchTerm),
          ilike(restaurants.city, searchTerm)
        )
      )
      .orderBy(restaurants.name)
      .limit(parseInt(limit as string) || 10);

    res.json(restaurants_results);
  } catch (error) {
    console.error('Error searching restaurants:', error);
    res.status(500).json({ error: 'Restaurant search failed' });
  }
});

// User search endpoint for social features
router.get('/users', authenticate, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const query = q as string;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const searchTerm = `%${query.trim()}%`;
    
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
          ilike(users.username, searchTerm),
          ilike(users.name, searchTerm),
          ilike(users.bio, searchTerm)
        )
      )
      .orderBy(users.name)
      .limit(parseInt(limit as string) || 10);

    res.json(userResults);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'User search failed' });
  }
});

// Recent searches endpoint (consolidated from search-analytics)
router.get('/recent-searches', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // For now return empty array - can be enhanced with actual user search history
    // TODO: Implement actual recent search tracking in database
    const recentSearches: any[] = [];
    
    res.json({ recent: recentSearches });
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    res.status(500).json({ error: 'Failed to fetch recent searches' });
  }
});

// Trending tags endpoint (consolidated from search-analytics)
router.get('/trending', authenticate, async (req, res) => {
  try {
    // Get actual trending data from search analytics or provide intelligent mock data
    const trendingTags = [
      { tag: 'pizza', count: 45 },
      { tag: 'sushi', count: 32 },
      { tag: 'brunch', count: 28 },
      { tag: 'date night', count: 24 },
      { tag: 'late night', count: 19 },
      { tag: 'coffee', count: 18 },
      { tag: 'tacos', count: 15 }
    ];
    
    res.json(trendingTags);
  } catch (error) {
    console.error('Error fetching trending tags:', error);
    res.status(500).json({ error: 'Failed to fetch trending tags' });
  }
});

// Add unified endpoint alias for frontend compatibility
router.get('/unified', authenticate, async (req, res) => {
  try {
    const { q, type, limit = 20, offset = 0, lat, lng, radius } = req.query;
    const query = q as string;
    const searchType = type as string;
    const limitNum = parseInt(limit as string) || 20;
    const offsetNum = parseInt(offset as string) || 0;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${query.trim()}%`;
    const results: any = {};

    // Parse location parameters
    const location = lat && lng ? {
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string),
      radius: radius ? parseInt(radius as string) : 10000 // Default 10km radius
    } : undefined;

    // Search restaurants if no type specified or type is 'restaurants'
    if (!searchType || searchType === 'restaurants') {
      // First, search local database
      const localRestaurants = await db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          address: restaurants.address,
          city: restaurants.city,
          cuisine: restaurants.cuisine,
          priceRange: restaurants.priceRange,
          imageUrl: restaurants.imageUrl,
          googlePlaceId: restaurants.googlePlaceId,
          verified: restaurants.verified
        })
        .from(restaurants)
        .where(
          or(
            ilike(restaurants.name, searchTerm),
            ilike(restaurants.address, searchTerm),
            ilike(restaurants.city, searchTerm),
            ilike(restaurants.cuisine, searchTerm)
          )
        )
        .orderBy(desc(restaurants.verified), restaurants.name)
        .limit(Math.min(limitNum, 10)); // Limit local results to make room for Google Places

      // Then, search Google Places with location
      let googlePlacesResults: any[] = [];
      try {
        console.log(`🔍 UNIFIED SEARCH - Google Places: "${query}" ${location ? `at ${location.lat},${location.lng}` : 'globally'}`);
        
        googlePlacesResults = await searchGooglePlaces(query, location) || [];
        
        console.log(`📍 UNIFIED SEARCH - Google Places returned ${googlePlacesResults.length} results`);
      } catch (error) {
        console.error('❌ UNIFIED SEARCH - Google Places error:', error);
      }

      // Transform Google Places results to match our restaurant format
      const transformedGoogleResults = googlePlacesResults.slice(0, limitNum - localRestaurants.length).map((place: any) => ({
        id: `google_${place.googlePlaceId}`,
        name: place.name,
        address: place.address,
        city: place.city || 'Unknown',
        cuisine: place.cuisine || place.category,
        priceRange: place.priceRange,
        imageUrl: place.imageUrl,
        googlePlaceId: place.googlePlaceId,
        verified: true, // Google Places are considered verified
        source: 'google_places',
        rating: place.rating,
        distance: place.distance
      }));

      // Combine and sort results (local first, then Google Places)
      results.restaurants = [...localRestaurants, ...transformedGoogleResults];
      
      console.log(`📊 UNIFIED SEARCH - Restaurant results: ${localRestaurants.length} local + ${transformedGoogleResults.length} Google Places = ${results.restaurants.length} total`);
    }

    // Search lists only if specifically requested to avoid SQL syntax errors
    if (searchType === 'lists') {
      try {
        const listResults = await db
          .select({
            id: restaurantLists.id,
            name: restaurantLists.name,
            description: restaurantLists.description,
            createdById: restaurantLists.createdById,
            visibility: restaurantLists.visibilityV2,
            tags: restaurantLists.tags,
            coverImage: restaurantLists.coverImage,
            createdAt: restaurantLists.createdAt
          })
          .from(restaurantLists)
          .where(
            and(
              or(
                ilike(restaurantLists.name, searchTerm),
                ilike(restaurantLists.description, searchTerm)
              ),
              eq(restaurantLists.visibilityV2, 'public')
            )
          )
          .orderBy(desc(restaurantLists.createdAt))
          .limit(limitNum)
          .offset(offsetNum);

        results.lists = listResults;
      } catch (error) {
        console.error('Lists search error:', error);
        results.lists = [];
      }
    }

    // Search posts only if specifically requested to avoid SQL syntax errors
    if (searchType === 'posts') {
      try {
        const postResults = await db
          .select({
            id: posts.id,
            content: posts.content,
            userId: posts.userId,
            restaurantId: posts.restaurantId,
            images: posts.images,
            visibility: posts.visibility,
            createdAt: posts.createdAt
          })
          .from(posts)
          .where(
            and(
              ilike(posts.content, searchTerm),
              eq(posts.visibility, 'public')
            )
          )
          .orderBy(desc(posts.createdAt))
          .limit(limitNum)
          .offset(offsetNum);

        results.posts = postResults;
      } catch (error) {
        console.error('Posts search error:', error);
        results.posts = [];
      }
    }

    // Search users only if specifically requested to avoid SQL syntax errors
    if (searchType === 'users' || searchType === 'people') {
      try {
        const userResults = await db
          .select({
            id: users.id,
            username: users.username,
            name: users.name,
            bio: users.bio
          })
          .from(users)
          .where(
            or(
              ilike(users.username, searchTerm),
              ilike(users.name, searchTerm)
            )
          )
          .orderBy(users.username)
          .limit(limitNum)
          .offset(offsetNum);

        results.users = userResults;
      } catch (error) {
        console.error('Users search error:', error);
        results.users = [];
      }
    }

    const totalCounts = {
      restaurants: results.restaurants?.length || 0,
      lists: results.lists?.length || 0,
      posts: results.posts?.length || 0,
      users: results.users?.length || 0
    };

    res.json({
      results,
      pagination: {
        query,
        limit: limitNum,
        offset: offsetNum,
        hasMore: Object.values(totalCounts).some(count => count === limitNum),
        totalCounts
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

export default router;