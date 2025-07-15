
import { Router } from 'express';
import { authenticate } from '../auth';
import { db } from '../db';
import { users, restaurants, restaurantLists, posts, userFollowers } from '@shared/schema';
import { eq, ilike, or, and, sql, desc, asc } from 'drizzle-orm';
import { searchGooglePlaces } from '../services/google-places';
import { SearchEngineService, EnhancedSearchEngine } from '../services/search-engine';

const router = Router();

// Enhanced search route with improved performance and result quality
router.get('/unified', authenticate, async (req, res) => {
  
  try {
    // Fix: Use req.user.id instead of req.session.userId
    const userId = req.user?.id;
    if (!userId) {
      // User not authenticated
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { 
      q: query, 
      lat, 
      lng, 
      radius = '15000', 
      limit = '20',
      type = 'all' 
    } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({
        restaurants: [],
        lists: [],
        posts: [],
        users: []
      });
    }

    const searchTerm = query.trim();
    const searchLat = lat ? parseFloat(lat as string) : undefined;
    const searchLng = lng ? parseFloat(lng as string) : undefined;
    const searchRadius = parseInt(radius as string);
    const resultLimit = Math.min(parseInt(limit as string), 50);

    // Enhanced filters
    const filters = {
      lat: searchLat,
      lng: searchLng,
      radius: searchRadius,
      // Add more filter support as needed
    };

    console.log(`Unified search for "${searchTerm}" with ${type} results`);

    // Use enhanced search engine for unified search
    if (type === "all") {
      try {
        const enhancedSearchEngine = EnhancedSearchEngine.getInstance();
        const searchResults = await enhancedSearchEngine.unifiedSearch(
          searchTerm,
          userId,
          filters,
          {
            restaurants: Math.floor(resultLimit * 0.5), // 50% restaurants
            lists: Math.floor(resultLimit * 0.2),      // 20% lists
            users: Math.floor(resultLimit * 0.15),     // 15% users
            posts: Math.floor(resultLimit * 0.15),     // 15% posts
          }
        );

        // Enhanced restaurant search with Google Places fallback
        let restaurantResults = searchResults.restaurants || [];

        // If we have few restaurant results, enhance with Google Places
        if (restaurantResults.length < 8) {
          try {
            const locationData = (searchLat && searchLng) ? { 
              lat: searchLat, 
              lng: searchLng, 
              radius: searchRadius 
            } : undefined;
            
            console.log(`Enhancing with Google Places search. Location:`, locationData);
            const googleResults = await searchGooglePlaces(searchTerm, locationData);

            // Filter out Google results that might conflict with database results
            const filteredGoogleResults = googleResults.filter(gr => 
              !restaurantResults.some(dr => 
                dr.metadata?.googlePlaceId === gr.googlePlaceId ||
                (dr.metadata?.name && gr.name && 
                 dr.metadata.name.toLowerCase() === gr.name.toLowerCase())
              )
            );

            // Format Google results to match search result format
            const formattedGoogleResults = filteredGoogleResults
              .slice(0, 12 - restaurantResults.length)
              .map(r => ({
                id: `google_${r.googlePlaceId}`,
                name: r.name,
                type: 'restaurant' as const,
                relevanceScore: 45, // Lower than database results but higher than default
                location: {
                  city: r.location,
                  address: r.address,
                  distance: undefined, // Could calculate if location provided
                },
                metadata: {
                  ...r,
                  avgRating: typeof r.rating === 'number' && !isNaN(r.rating) ? r.rating : 4.0,
                  source: 'google',
                  thumbnailUrl: r.imageUrl,
                  category: r.category,
                  priceRange: r.priceRange,
                  cuisine: r.cuisine,
                  reviewCount: r.reviewCount || 0,
                },
              }));

            restaurantResults.push(...formattedGoogleResults);
            console.log(`Added ${formattedGoogleResults.length} Google Places results`);
          } catch (googleError) {
            console.error("Google Places enhancement error:", googleError);
          }
        }

        // Sort restaurant results by relevance and rating
        restaurantResults.sort((a, b) => {
          const aScore = a.relevanceScore + (a.metadata?.avgRating || 0) * 5;
          const bScore = b.relevanceScore + (b.metadata?.avgRating || 0) * 5;
          return bScore - aScore;
        });

        const formattedResults = {
          restaurants: restaurantResults.map(r => ({
            ...r,
            avgRating: r.metadata?.avgRating || 4.0,
            thumbnailUrl: r.metadata?.thumbnailUrl || r.metadata?.imageUrl,
            location: r.location?.city || r.metadata?.location,
            subtitle: r.metadata?.category || r.metadata?.cuisine,
            source: r.id.toString().startsWith('google_') ? 'google' : 'database'
          })),
          lists: (searchResults.lists || []).map(l => ({
            ...l,
            type: 'list' as const,
            subtitle: l.metadata?.description || `${l.metadata?.type || 'restaurant'} list`,
            thumbnailUrl: l.metadata?.coverImage,
          })),
          posts: (searchResults.posts || []).map(p => ({
            ...p,
            type: 'post' as const,
            subtitle: p.metadata?.restaurant?.name || 'Dining post',
            thumbnailUrl: p.metadata?.images?.[0],
          })),
          users: (searchResults.users || []).map(u => ({
            ...u,
            type: 'user' as const,
            subtitle: u.metadata?.bio || 'Food enthusiast',
            thumbnailUrl: u.metadata?.profilePicture,
          })),
        };

        return res.json(formattedResults);
      } catch (searchError) {
        console.error("Enhanced search error:", searchError);
        // Fallback to basic search
      }
    }

    // Individual search type handling with enhanced Google Places integration
    if (type === "restaurants") {
      try {
        // Start with database search
        const dbRestaurants = await db.select({
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          category: restaurants.category,
          priceRange: restaurants.priceRange,
          cuisine: restaurants.cuisine,
          address: restaurants.address,
          imageUrl: restaurants.imageUrl,
          avgRating: sql<number>`COALESCE(AVG(${posts.rating}), 4.0)`,
          postCount: sql<number>`COUNT(${posts.id})`,
          googlePlaceId: restaurants.googlePlaceId,
        })
        .from(restaurants)
        .leftJoin(posts, eq(restaurants.id, posts.restaurantId))
        .where(
          or(
            ilike(restaurants.name, `%${searchTerm}%`),
            ilike(restaurants.location, `%${searchTerm}%`),
            ilike(restaurants.category, `%${searchTerm}%`),
            ilike(restaurants.cuisine, `%${searchTerm}%`),
            ilike(restaurants.address, `%${searchTerm}%`)
          )
        )
        .groupBy(restaurants.id)
        .orderBy(desc(sql`AVG(${posts.rating})`), desc(sql`COUNT(${posts.id})`))
        .limit(15);

        console.log(`Database search returned ${dbRestaurants.length} restaurants`);

        // Enhanced Google Places search if we need more results
        let allResults = [...dbRestaurants];
        
        if (dbRestaurants.length < 10) {
          try {
            const locationData = (searchLat && searchLng) ? { 
              lat: searchLat, 
              lng: searchLng, 
              radius: searchRadius 
            } : undefined;
            
            const googleResults = await searchGooglePlaces(searchTerm, locationData);
            
            // Filter out duplicates more intelligently
            const filteredGoogleResults = googleResults.filter(gr => {
              // Check for exact Google Place ID match
              if (dbRestaurants.some(dr => dr.googlePlaceId === gr.googlePlaceId)) {
                return false;
              }
              
              // Check for similar names (fuzzy matching)
              const grNameLower = gr.name.toLowerCase();
              return !dbRestaurants.some(dr => {
                const drNameLower = dr.name.toLowerCase();
                return (
                  drNameLower === grNameLower ||
                  drNameLower.includes(grNameLower) ||
                  grNameLower.includes(drNameLower)
                );
              });
            });

            // Add Google results with Google-specific formatting
            const formattedGoogleResults = filteredGoogleResults
              .slice(0, 15 - dbRestaurants.length)
              .map(r => ({
                id: `google_${r.googlePlaceId}`,
                name: r.name,
                location: r.location,
                category: r.category,
                priceRange: r.priceRange,
                cuisine: r.cuisine,
                address: r.address,
                imageUrl: r.imageUrl,
                avgRating: typeof r.rating === 'number' && !isNaN(r.rating) ? r.rating : 4.0,
                postCount: 0,
                googlePlaceId: r.googlePlaceId,
                source: 'google' as const,
                reviewCount: r.reviewCount || 0,
                isOpen: r.isOpen,
              }));

            allResults.push(...formattedGoogleResults);
            console.log(`Added ${formattedGoogleResults.length} Google Places results`);
          } catch (googleError) {
            console.error("Google Places search error:", googleError);
          }
        }

        // Enhanced result formatting
        const formattedResults = allResults.map(r => ({
          id: r.id.toString(),
          name: r.name,
          type: 'restaurant' as const,
          avgRating: typeof r.avgRating === 'number' && !isNaN(r.avgRating) ? r.avgRating : 4.0,
          location: r.location,
          category: r.category,
          priceRange: r.priceRange,
          cuisine: r.cuisine,
          address: r.address,
          thumbnailUrl: r.imageUrl,
          source: r.id.toString().startsWith('google_') ? 'google' : 'database',
          relevanceScore: r.id.toString().startsWith('google_') ? 50 : 80,
          subtitle: `${r.category || r.cuisine || 'Restaurant'} • ${r.priceRange || '$$'}`,
          googlePlaceId: r.googlePlaceId,
          reviewCount: 'reviewCount' in r ? r.reviewCount : r.postCount,
          isOpen: 'isOpen' in r ? r.isOpen : undefined,
        }));

        return res.json(formattedResults);
      } catch (error) {
        console.error("Restaurant search error:", error);
        return res.status(500).json({ error: 'Restaurant search failed' });
      }
    }

    // Enhanced list search
    if (type === "lists") {
      const lists = await db.select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        type: restaurantLists.type,
        coverImage: restaurantLists.coverImage,
        primaryLocation: restaurantLists.primaryLocation,
        viewCount: restaurantLists.viewCount,
        saveCount: restaurantLists.saveCount,
        createdById: restaurantLists.createdById,
        tags: restaurantLists.tags,
        createdAt: restaurantLists.createdAt,
      })
      .from(restaurantLists)
      .where(
        and(
          or(
            ilike(restaurantLists.name, `%${searchTerm}%`),
            ilike(restaurantLists.description, `%${searchTerm}%`),
            sql`${restaurantLists.tags}::text ILIKE ${'%' + searchTerm + '%'}`
          ),
          eq(restaurantLists.makePublic, true) // Only public lists
        )
      )
      .orderBy(desc(restaurantLists.viewCount), desc(restaurantLists.saveCount))
      .limit(resultLimit);

      const formattedLists = lists.map(l => ({
        id: l.id.toString(),
        name: l.name,
        type: 'list' as const,
        subtitle: l.description || `${l.type} list`,
        thumbnailUrl: l.coverImage,
        location: l.primaryLocation,
        metadata: {
          viewCount: l.viewCount,
          saveCount: l.saveCount,
          tags: l.tags,
          createdAt: l.createdAt,
        }
      }));

      return res.json(formattedLists);
    }

    // Enhanced user search with follow status
    if (type === "users") {
      const userResults = await db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        bio: users.bio,
        profilePicture: users.profilePicture,
        preferredCuisines: users.preferredCuisines,
        favoriteFood: users.favoriteFood,
        favoriteRestaurant: users.favoriteRestaurant,
        // Check if current user is following this user
        isFollowing: sql<boolean>`
          EXISTS (
            SELECT 1 FROM ${userFollowers} 
            WHERE follower_id = ${userId} AND following_id = ${users.id}
          )
        `.as('isFollowing')
      })
      .from(users)
      .where(
        and(
          or(
            ilike(users.name, `%${searchTerm}%`),
            ilike(users.username, `%${searchTerm}%`),
            ilike(users.bio, `%${searchTerm}%`),
            ilike(users.favoriteFood, `%${searchTerm}%`),
            ilike(users.favoriteRestaurant, `%${searchTerm}%`)
          ),
          // Don't show current user in results
          sql`${users.id} != ${userId}`
        )
      )
      .limit(resultLimit);

      const formattedUsers = userResults.map(u => ({
        id: u.id.toString(),
        name: u.name,
        type: 'user' as const,
        username: u.username,
        bio: u.bio,
        profilePicture: u.profilePicture,
        isFollowing: u.isFollowing,
        subtitle: u.bio || 'Food enthusiast',
        thumbnailUrl: u.profilePicture,
        tags: u.preferredCuisines || [],
        metadata: {
          username: u.username,
          preferredCuisines: u.preferredCuisines,
          favoriteFood: u.favoriteFood,
          favoriteRestaurant: u.favoriteRestaurant,
        }
      }));

      return res.json(formattedUsers);
    }

    // Enhanced post search
    if (type === "posts") {
      const postResults = await db.select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        images: posts.images,
        dishesTried: posts.dishesTried,
        createdAt: posts.createdAt,
        userId: posts.userId,
        restaurantId: posts.restaurantId,
        authorName: users.name,
        restaurantName: restaurants.name,
        restaurantLocation: restaurants.location,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .where(
        or(
          ilike(posts.content, `%${searchTerm}%`),
          sql`${posts.dishesTried}::text ILIKE ${'%' + searchTerm + '%'}`
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(resultLimit);

      const formattedPosts = postResults.map(p => ({
        id: p.id.toString(),
        name: p.content.slice(0, 50) + (p.content.length > 50 ? '...' : ''),
        type: 'post' as const,
        subtitle: `${p.authorName} at ${p.restaurantName}`,
        thumbnailUrl: p.images?.[0],
        metadata: {
          content: p.content,
          rating: p.rating,
          restaurant: {
            id: p.restaurantId,
            name: p.restaurantName,
            location: p.restaurantLocation,
          },
          author: {
            id: p.userId,
            name: p.authorName,
          },
          dishesTried: p.dishesTried,
          createdAt: p.createdAt,
        }
      }));

      return res.json(formattedPosts);
    }

    // Fallback empty results
    return res.json([]);

  } catch (error) {
    console.error('Unified search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Enhanced trending endpoint with personalization and location awareness
router.get('/trending', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { lat, lng, radius = '25000' } = req.query;
    const searchLat = lat ? parseFloat(lat as string) : undefined;
    const searchLng = lng ? parseFloat(lng as string) : undefined;
    const searchRadius = parseInt(radius as string);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's followers for personalized trending
    const userFollowersQuery = await db
      .select({ followingId: userFollowers.followingId })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));
    
    const followedIds = userFollowersQuery.map(f => f.followingId);
    
    // Get user's preferred cuisines for personalization
    const userProfile = await db
      .select({ 
        preferredCuisines: users.preferredCuisines,
        favoriteFood: users.favoriteFood,
        favoriteRestaurant: users.favoriteRestaurant
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userCuisines = userProfile[0]?.preferredCuisines || [];

    // Simplified trending restaurants query
    let trendingRestaurants;
    
    if (searchLat && searchLng) {
      // Location-based trending with location filtering
      console.log(`Fetching location-based trending for user ${userId} at ${searchLat}, ${searchLng}`);
      
      trendingRestaurants = await db.select({
        id: restaurants.id,
        name: restaurants.name,
        location: restaurants.location,
        category: restaurants.category,
        cuisine: restaurants.cuisine,
        imageUrl: restaurants.imageUrl,
        avgRating: sql<number>`COALESCE(AVG(${posts.rating}), 4.0)`,
        postCount: sql<number>`COUNT(${posts.id})`,
        latitude: restaurants.latitude,
        longitude: restaurants.longitude,
      })
      .from(restaurants)
      .leftJoin(posts, eq(restaurants.id, posts.restaurantId))
      .where(
        and(
          sql`${restaurants.latitude} IS NOT NULL`,
          sql`${restaurants.longitude} IS NOT NULL`
        )
      )
      .groupBy(restaurants.id)
      .orderBy(desc(sql`COUNT(${posts.id})`), desc(sql`AVG(${posts.rating})`))
      .limit(10);

      // Enhance with Google Places for location if we have few results
      if (trendingRestaurants.length < 8) {
        try {
          const locationBasedResults = await searchGooglePlaces('popular restaurants trending', {
            lat: searchLat,
            lng: searchLng,
            radius: searchRadius
          });

          const formattedLocationResults = locationBasedResults.slice(0, 8 - trendingRestaurants.length).map(r => ({
            id: `google_${r.googlePlaceId}`,
            name: r.name,
            location: r.location,
            category: r.category,
            cuisine: r.cuisine,
            imageUrl: r.imageUrl,
            avgRating: r.rating || 4.0,
            postCount: 0,
            latitude: r.latitude,
            longitude: r.longitude,
            type: 'restaurant' as const,
            source: 'google' as const,
          }));

          trendingRestaurants.push(...formattedLocationResults);
        } catch (error) {
          console.error('Error fetching location-based trending from Google:', error);
        }
      }
    } else {
      // Global trending restaurants
      trendingRestaurants = await db.select({
        id: restaurants.id,
        name: restaurants.name,
        location: restaurants.location,
        category: restaurants.category,
        cuisine: restaurants.cuisine,
        imageUrl: restaurants.imageUrl,
        avgRating: sql<number>`COALESCE(AVG(${posts.rating}), 4.0)`,
        postCount: sql<number>`COUNT(${posts.id})`,
      })
      .from(restaurants)
      .leftJoin(posts, eq(restaurants.id, posts.restaurantId))
      .groupBy(restaurants.id)
      .orderBy(desc(sql`COUNT(${posts.id})`), desc(sql`AVG(${posts.rating})`))
      .limit(10);
    }

    const trending = {
      trending: trendingRestaurants.map(r => ({
        id: r.id.toString(),
        name: r.name,
        type: 'restaurant' as const,
        location: r.location,
        category: r.category,
        thumbnailUrl: r.imageUrl,
        avgRating: typeof r.avgRating === 'number' ? r.avgRating : 4.0,
        viewCount: r.postCount || 0,
        source: r.id.toString().startsWith('google_') ? 'google' : 'database',
      }))
    };

    res.json(trending);
  } catch (error) {
    console.error('Trending search error:', error);
    res.status(500).json({ error: 'Failed to fetch trending content' });
  }
});

// Recent searches endpoint for personalized search experience
router.get('/recent-searches', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's recent searches from analytics (fallback to empty if table doesn't exist)
    const recentSearches: any[] = [];

    // Get user's followers for personalized suggestions
    const userFollowersQuery = await db
      .select({ followedId: userFollowers.followedId })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));
    
    const followedIds = userFollowersQuery.map(f => f.followedId);

    // Get trending searches from user's network
    const networkTrending = await db
      .select({ 
        searchQuery: analytics.searchQuery,
        searchCount: sql<number>`COUNT(*)`,
      })
      .from(analytics)
      .where(
        and(
          sql`${analytics.userId} = ANY(${followedIds})`,
          eq(analytics.action, 'search'),
          sql`${analytics.searchQuery} IS NOT NULL AND ${analytics.searchQuery} != ''`,
          sql`${analytics.timestamp} > NOW() - INTERVAL '7 days'`
        )
      )
      .groupBy(analytics.searchQuery)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(5);

    // Get user's profile for cuisine preferences
    const userProfile = await db
      .select({ 
        preferredCuisines: users.preferredCuisines,
        favoriteFood: users.favoriteFood
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userCuisines = userProfile[0]?.preferredCuisines || [];
    const favoriteFood = userProfile[0]?.favoriteFood;

    // Build personalized suggestions
    const suggestions = [
      ...(favoriteFood ? [favoriteFood] : []),
      ...userCuisines.slice(0, 3),
      ...networkTrending.map(t => t.searchQuery),
    ].filter(Boolean).slice(0, 5);

    res.json({
      recent: recentSearches.map(s => s.searchQuery).slice(0, 5),
      suggestions,
      networkTrending: networkTrending.map(t => t.searchQuery)
    });
  } catch (error) {
    console.error('Recent searches error:', error);
    // Return fallback suggestions if query fails
    res.json({
      recent: [],
      suggestions: ['Pizza', 'Sushi', 'Coffee', 'Brunch', 'Date night'],
      networkTrending: []
    });
  }
});

export default router;
