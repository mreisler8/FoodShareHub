import { Router } from 'express';
import { authenticate } from '../auth';
import { db } from '../db';
import { users, restaurants, restaurantLists, posts, userFollowers } from '@shared/schema';
import { eq, ilike, or, and, sql, desc, asc } from 'drizzle-orm';
import { searchGooglePlaces } from '../services/google-places';

const router = Router();

// Helper function to detect if a search term is likely a person's name
function isPersonNameQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim();

  // Restaurant-related terms that should NOT be treated as person names
  const restaurantTerms = [
    'restaurant', 'cafe', 'bar', 'grill', 'kitchen', 'bistro', 'eatery', 'diner',
    'pizza', 'burger', 'sushi', 'taco', 'sandwich', 'bakery', 'brewery', 'pub',
    'steakhouse', 'seafood', 'food', 'eat', 'dining', 'menu', 'dish', 'meal',
    'lunch', 'dinner', 'breakfast', 'brunch', 'coffee', 'tea', 'wine', 'cocktail',
    'odds', 'oddseoul', 'badiali', 'pizzeria', 'trattoria', 'brasserie', 'tavern',
    'veselka', 'katz', 'russ', 'daughters'
  ];

  // Specific restaurant names that should be enhanced
  const knownRestaurantNames = [
    'oddseoul', 'odd seoul', 'badiali', 'pizzeria badiali', 'veselka', 'katz deli',
    'russ daughters', 'peter luger', 'grammercy tavern'
  ];

  // If the query is a known restaurant name, definitely not a person
  if (knownRestaurantNames.some(name => lowerQuery.includes(name) || name.includes(lowerQuery))) {
    return false;
  }

  // If the query contains any restaurant terms, it's not a person name
  if (restaurantTerms.some(term => lowerQuery.includes(term))) {
    return false;
  }

  // Queries with 3 or fewer characters that don't match known restaurants are likely person names
  if (lowerQuery.length <= 3) {
    return true;
  }

  // Common person name patterns (only for longer queries)
  const personNamePatterns = [
    /^[a-z]+\s+[a-z]+$/,  // "john smith"
    /^(alex|mike|john|jane|bob|sue|tom|amy|joe|ann|ben|sam|dan|max|kim|pat|ray|jim|ron|ted|tim|guy|leo|eva|zoe|ian|kai|eli|ivy|sky|rio|drew|cole|dean|finn|gray|jude|luke|noah|owen|seth|will|zane)$/i
  ];

  return personNamePatterns.some(pattern => pattern.test(lowerQuery));
}

// Optimized unified search with database and Google Places integration
router.get('/unified', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
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

    console.log(`Enhanced unified search for "${searchTerm}" by user ${userId}`);

    // Enhanced search with proper result formatting
    if (type === "all") {
      try {
        // Parallel database searches with enhanced queries
        const [dbRestaurants, dbUsers, dbLists, dbPosts] = await Promise.all([
          // Enhanced restaurant search
          db.select({
            id: restaurants.id,
            name: restaurants.name,
            location: restaurants.location,
            category: restaurants.category,
            priceRange: restaurants.priceRange,
            cuisine: restaurants.cuisine,
            address: restaurants.address,
            imageUrl: restaurants.imageUrl,
            city: restaurants.city,
            state: restaurants.state,
            latitude: restaurants.latitude,
            longitude: restaurants.longitude,
            googlePlaceId: restaurants.googlePlaceId,
            avgRating: sql<number>`COALESCE(AVG(${posts.rating}), 4.0)`,
            reviewCount: sql<number>`COUNT(${posts.id})`,
          })
          .from(restaurants)
          .leftJoin(posts, eq(restaurants.id, posts.restaurantId))
          .where(
            or(
              ilike(restaurants.name, `%${searchTerm}%`),
              ilike(restaurants.location, `%${searchTerm}%`),
              ilike(restaurants.city, `%${searchTerm}%`),
              ilike(restaurants.category, `%${searchTerm}%`),
              ilike(restaurants.cuisine, `%${searchTerm}%`),
              ilike(restaurants.address, `%${searchTerm}%`),
              // Enhanced semantic search
              sql`LOWER(${restaurants.name}) LIKE LOWER(${'%' + searchTerm.replace(/\s+/g, '%') + '%'})`,
              sql`LOWER(${restaurants.category}) LIKE LOWER(${'%' + searchTerm + '%'})`,
              sql`LOWER(${restaurants.cuisine}) LIKE LOWER(${'%' + searchTerm + '%'})`
            )
          )
          .groupBy(restaurants.id)
          .orderBy(desc(sql`AVG(${posts.rating})`), desc(sql`COUNT(${posts.id})`))
          .limit(Math.floor(resultLimit * 0.5)),

          // Enhanced user search with follow status
          db.select({
            id: users.id,
            name: users.name,
            username: users.username,
            bio: users.bio,
            profilePicture: users.profilePicture,
            preferredCuisines: users.preferredCuisines,
            favoriteFood: users.favoriteFood,
            favoriteRestaurant: users.favoriteRestaurant,
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
                ilike(users.favoriteRestaurant, `%${searchTerm}%`),
                sql`${users.preferredCuisines}::text ILIKE ${'%' + searchTerm + '%'}`
              ),
              sql`${users.id} != ${userId}`
            )
          )
          .limit(Math.floor(resultLimit * 0.2)),

          // Enhanced list search
          db.select({
            id: restaurantLists.id,
            name: restaurantLists.name,
            description: restaurantLists.description,
            type: restaurantLists.type,
            tags: restaurantLists.tags,
            coverImage: restaurantLists.coverImage,
            viewCount: restaurantLists.viewCount,
            saveCount: restaurantLists.saveCount,
            createdAt: restaurantLists.createdAt,
            primaryLocation: restaurantLists.primaryLocation,
            isPublic: restaurantLists.makePublic,
            createdById: restaurantLists.createdById,
            creatorName: users.name,
          })
          .from(restaurantLists)
          .leftJoin(users, eq(restaurantLists.createdById, users.id))
          .where(
            and(
              or(
                ilike(restaurantLists.name, `%${searchTerm}%`),
                ilike(restaurantLists.description, `%${searchTerm}%`),
                ilike(restaurantLists.primaryLocation, `%${searchTerm}%`),
                sql`${restaurantLists.tags}::text ILIKE ${'%' + searchTerm + '%'}`
              ),
              eq(restaurantLists.makePublic, true)
            )
          )
          .orderBy(desc(restaurantLists.viewCount), desc(restaurantLists.saveCount))
          .limit(Math.floor(resultLimit * 0.15)),

          // Enhanced post search
          db.select({
            id: posts.id,
            content: posts.content,
            rating: posts.rating,
            images: posts.images,
            dishesTried: posts.dishesTried,
            createdAt: posts.createdAt,
            userId: posts.userId,
            restaurantId: posts.restaurantId,
            authorName: users.name,
            authorUsername: users.username,
            restaurantName: restaurants.name,
            restaurantLocation: restaurants.location,
          })
          .from(posts)
          .leftJoin(users, eq(posts.userId, users.id))
          .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
          .where(
            or(
              ilike(posts.content, `%${searchTerm}%`),
              sql`${posts.dishesTried}::text ILIKE ${'%' + searchTerm + '%'}`,
              ilike(restaurants.name, `%${searchTerm}%`),
              ilike(restaurants.location, `%${searchTerm}%`)
            )
          )
          .orderBy(desc(posts.createdAt))
          .limit(Math.floor(resultLimit * 0.15))
        ]);

        // Enhanced Google Places search if restaurant results are insufficient
        // Only apply Google Places enhancement for restaurant-focused searches
        let restaurantResults = dbRestaurants;

        // Check if search term is likely a person's name to avoid restaurant enhancement
        const isPersonNameSearch = isPersonNameQuery(searchTerm);

        console.log(`DEBUG: Search term "${searchTerm}" - isPersonNameSearch: ${isPersonNameSearch}, dbRestaurants.length: ${dbRestaurants.length}`);

        if (dbRestaurants.length < 8 && !isPersonNameSearch) {
          try {
            const locationData = (searchLat && searchLng) ? { 
              lat: searchLat, 
              lng: searchLng, 
              radius: searchRadius 
            } : undefined;

            console.log(`Enhancing with Google Places search for "${searchTerm}"`);
            const googleResults = await searchGooglePlaces(searchTerm, locationData);

            // Enhanced deduplication and formatting
            const filteredGoogleResults = googleResults
              .filter(gr => !dbRestaurants.some(dr => 
                dr.googlePlaceId === gr.googlePlaceId ||
                (dr.name.toLowerCase() === gr.name.toLowerCase() && 
                 dr.location?.toLowerCase() === gr.location?.toLowerCase())
              ))
              .slice(0, 12 - dbRestaurants.length)
              .map(r => ({
                id: `google_${r.googlePlaceId}`,
                name: r.name,
                location: r.location,
                category: r.category,
                priceRange: r.priceRange,
                cuisine: r.cuisine,
                address: r.address,
                imageUrl: r.imageUrl,
                city: r.city,
                state: r.state,
                latitude: r.latitude,
                longitude: r.longitude,
                googlePlaceId: r.googlePlaceId,
                avgRating: r.rating || 4.0,
                reviewCount: r.reviewCount || 0,
              }));

            restaurantResults = [...dbRestaurants, ...filteredGoogleResults];
            console.log(`Added ${filteredGoogleResults.length} Google Places results`);
          } catch (googleError) {
            console.error("Google Places enhancement error:", googleError);
          }
        }

        // Enhanced result formatting with proper navigation
        const formattedResults = {
          restaurants: restaurantResults.map(r => ({
            id: r.id.toString(),
            name: r.name,
            type: 'restaurant' as const,
            subtitle: buildRestaurantSubtitle(r),
            location: r.city || r.location || 'Unknown location',
            avgRating: typeof r.avgRating === 'number' && !isNaN(r.avgRating) ? r.avgRating : 4.0,
            thumbnailUrl: r.imageUrl,
            source: r.id.toString().startsWith('google_') ? 'google' : 'database',
            metadata: {
              category: r.category,
              priceRange: r.priceRange,
              cuisine: r.cuisine,
              address: r.address,
              reviewCount: r.reviewCount || 0,
              googlePlaceId: r.googlePlaceId,
            }
          })),

          lists: dbLists.map(l => ({
            id: l.id.toString(),
            name: l.name,
            type: 'list' as const,
            subtitle: l.description || `${l.type || 'restaurant'} list by ${l.creatorName}`,
            thumbnailUrl: l.coverImage,
            location: l.primaryLocation,
            metadata: {
              type: l.type,
              viewCount: l.viewCount,
              saveCount: l.saveCount,
              tags: l.tags,
              createdById: l.createdById,
              creatorName: l.creatorName,
            }
          })),

          posts: dbPosts.map(p => ({
            id: p.id.toString(),
            name: truncateText(p.content, 60),
            type: 'post' as const,
            subtitle: `${p.authorName} at ${p.restaurantName}`,
            thumbnailUrl: p.images?.[0],
            metadata: {
              content: p.content,
              rating: p.rating,
              authorName: p.authorName,
              authorUsername: p.authorUsername,
              restaurantName: p.restaurantName,
              restaurantLocation: p.restaurantLocation,
              dishesTried: p.dishesTried,
              createdAt: p.createdAt,
            }
          })),

          users: dbUsers.map(u => {
            console.log(`DEBUG: User ${u.name} (ID: ${u.id}) isFollowing: ${u.isFollowing} (type: ${typeof u.isFollowing})`);
            return {
              id: u.id.toString(),
              name: u.name,
              type: 'user' as const,
              subtitle: u.bio || `@${u.username}`,
              thumbnailUrl: u.profilePicture,
              avatar: u.profilePicture, // For compatibility with SearchResultsList
              username: u.username,
              bio: u.bio,
              profilePicture: u.profilePicture,
              isFollowing: Boolean(u.isFollowing), // Ensure it's always a boolean
              metadata: {
                username: u.username,
                preferredCuisines: u.preferredCuisines,
                favoriteFood: u.favoriteFood,
                favoriteRestaurant: u.favoriteRestaurant,
              }
            };
          })
        };

        console.log(`Search results: ${formattedResults.restaurants.length} restaurants, ${formattedResults.lists.length} lists, ${formattedResults.posts.length} posts, ${formattedResults.users.length} users`);

        // Add caching headers for better performance
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        return res.json(formattedResults);

      } catch (searchError) {
        console.error("Unified search error:", searchError);
        return res.status(500).json({ error: 'Search failed' });
      }
    }

    // Individual type searches with enhanced formatting
    if (type === "restaurants") {
      const restaurants = await searchRestaurants(searchTerm, searchLat, searchLng, searchRadius, resultLimit);
      return res.json(restaurants);
    }

    if (type === "lists") {
      const lists = await searchLists(searchTerm, resultLimit);
      return res.json(lists);
    }

    if (type === "users") {
      const users = await searchUsers(searchTerm, userId, resultLimit);
      return res.json(users);
    }

    if (type === "posts") {
      const posts = await searchPosts(searchTerm, resultLimit);
      return res.json(posts);
    }

    return res.json([]);

  } catch (error) {
    console.error('Unified search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Helper functions for individual searches
async function searchRestaurants(searchTerm: string, lat?: number, lng?: number, radius?: number, limit: number = 20) {
  const dbResults = await db.select({
    id: restaurants.id,
    name: restaurants.name,
    location: restaurants.location,
    category: restaurants.category,
    priceRange: restaurants.priceRange,
    cuisine: restaurants.cuisine,
    address: restaurants.address,
    imageUrl: restaurants.imageUrl,
    avgRating: sql<number>`COALESCE(AVG(${posts.rating}), 4.0)`,
    reviewCount: sql<number>`COUNT(${posts.id})`,
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
  .limit(limit);

  // Enhanced with Google Places if needed (avoid for person name searches)
  let allResults = [...dbResults];
  if (dbResults.length < 10 && !isPersonNameQuery(searchTerm)) {
    try {
      const locationData = (lat && lng) ? { lat, lng, radius: radius || 15000 } : undefined;
      const googleResults = await searchGooglePlaces(searchTerm, locationData);

      const formattedGoogleResults = googleResults
        .filter(gr => !dbResults.some(dr => dr.googlePlaceId === gr.googlePlaceId))
        .slice(0, limit - dbResults.length)
        .map(r => ({
          id: `google_${r.googlePlaceId}`,
          name: r.name,
          location: r.location,
          category: r.category,
          priceRange: r.priceRange,
          cuisine: r.cuisine,
          address: r.address,
          imageUrl: r.imageUrl,
          avgRating: r.rating || 4.0,
          reviewCount: r.reviewCount || 0,
          googlePlaceId: r.googlePlaceId,
        }));

      allResults.push(...formattedGoogleResults);
    } catch (error) {
      console.error('Google Places search error:', error);
    }
  }

  return allResults.map(r => ({
    id: r.id.toString(),
    name: r.name,
    type: 'restaurant' as const,
    subtitle: buildRestaurantSubtitle(r),
    location: r.location,
    avgRating: r.avgRating,
    thumbnailUrl: r.imageUrl,
    source: r.id.toString().startsWith('google_') ? 'google' : 'database',
    metadata: r
  }));
}

async function searchLists(searchTerm: string, limit: number = 10) {
  const results = await db.select({
    id: restaurantLists.id,
    name: restaurantLists.name,
    description: restaurantLists.description,
    type: restaurantLists.type,
    coverImage: restaurantLists.coverImage,
    viewCount: restaurantLists.viewCount,
    saveCount: restaurantLists.saveCount,
    tags: restaurantLists.tags,
    primaryLocation: restaurantLists.primaryLocation,
  })
  .from(restaurantLists)
  .where(
    and(
      or(
        ilike(restaurantLists.name, `%${searchTerm}%`),
        ilike(restaurantLists.description, `%${searchTerm}%`),
        sql`${restaurantLists.tags}::text ILIKE ${'%' + searchTerm + '%'}`
      ),
      eq(restaurantLists.makePublic, true)
    )
  )
  .orderBy(desc(restaurantLists.viewCount), desc(restaurantLists.saveCount))
  .limit(limit);

  return results.map(l => ({
    id: l.id.toString(),
    name: l.name,
    type: 'list' as const,
    subtitle: l.description || `${l.type} list`,
    thumbnailUrl: l.coverImage,
    location: l.primaryLocation,
    metadata: l
  }));
}

async function searchUsers(searchTerm: string, currentUserId: number, limit: number = 10) {
  const results = await db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    bio: users.bio,
    profilePicture: users.profilePicture,
    isFollowing: sql<boolean>`
      EXISTS (
        SELECT 1 FROM ${userFollowers} 
        WHERE follower_id = ${currentUserId} AND following_id = ${users.id}
      )
    `.as('isFollowing')
  })
  .from(users)
  .where(
    and(
      or(
        ilike(users.name, `%${searchTerm}%`),
        ilike(users.username, `%${searchTerm}%`),
        ilike(users.bio, `%${searchTerm}%`)
      ),
      sql`${users.id} != ${currentUserId}`
    )
  )
  .limit(limit);

  return results.map(u => ({
    id: u.id.toString(),
    name: u.name,
    type: 'user' as const,
    subtitle: u.bio || 'Food enthusiast',
    thumbnailUrl: u.profilePicture,
    username: u.username,
    isFollowing: u.isFollowing,
    metadata: u
  }));
}

async function searchPosts(searchTerm: string, limit: number = 10) {
  const results = await db.select({
    id: posts.id,
    content: posts.content,
    rating: posts.rating,
    images: posts.images,
    createdAt: posts.createdAt,
    authorName: users.name,
    restaurantName: restaurants.name,
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
  .limit(limit);

  return results.map(p => ({
    id: p.id.toString(),
    name: truncateText(p.content, 60),
    type: 'post' as const,
    subtitle: `${p.authorName} at ${p.restaurantName}`,
    thumbnailUrl: p.images?.[0],
    metadata: p
  }));
}

// Enhanced trending endpoint with proper location support
router.get('/trending', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { lat, lng, radius = '25000' } = req.query;
    const searchLat = lat ? parseFloat(lat as string) : undefined;
    const searchLng = lng ? parseFloat(lng as string) : undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`Fetching trending content for user ${userId}${searchLat && searchLng ? ` at ${searchLat}, ${searchLng}` : ''}`);

    let trendingRestaurants = [];

    // Prioritize location-based results if GPS is available
    if (searchLat && searchLng) {
      try {
        console.log(`Fetching location-based trending for ${searchLat}, ${searchLng}`);
        const locationResults = await searchGooglePlaces('popular restaurants trending', {
          lat: searchLat,
          lng: searchLng,
          radius: parseInt(radius as string)
        });

        trendingRestaurants = locationResults.slice(0, 8).map(r => ({
          id: `google_${r.googlePlaceId}`,
          name: r.name,
          location: r.location,
          category: r.category,
          cuisine: r.cuisine,
          imageUrl: r.imageUrl,
          avgRating: r.rating || 4.0,
          postCount: 0,
        }));

        console.log(`Found ${trendingRestaurants.length} location-based trending restaurants`);
      } catch (error) {
        console.error('Error fetching location-based trending:', error);
      }
    }

    // Fallback to database results if no location or insufficient results
    if (trendingRestaurants.length < 8) {
      try {
        const dbResults = await db.select({
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
        .limit(8 - trendingRestaurants.length);

        trendingRestaurants.push(...dbResults);
      } catch (error) {
        console.error('Error fetching database trending:', error);
      }
    }

    const trending = {
      trending: trendingRestaurants.map(r => ({
        id: r.id.toString(),
        name: r.name,
        type: 'restaurant' as const,
        location: r.location,
        category: r.category,
        thumbnailUrl: r.imageUrl,
        avgRating: r.avgRating,
        viewCount: r.postCount,
        source: r.id.toString().startsWith('google_') ? 'google' : 'database',
      }))
    };

    res.json(trending);
  } catch (error) {
    console.error('Trending search error:', error);
    res.status(500).json({ error: 'Failed to fetch trending content' });
  }
});

// Fixed recent searches endpoint
router.get('/recent-searches', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's profile for personalized suggestions
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
      'Pizza', 'Sushi', 'Coffee', 'Brunch', 'Date night'
    ].filter(Boolean).slice(0, 8);

    res.json({
      recent: [], // Will be populated when search analytics table is properly set up
      suggestions,
      networkTrending: []
    });
  } catch (error) {
    console.error('Recent searches error:', error);
    res.json({
      recent: [],
      suggestions: ['Pizza', 'Sushi', 'Coffee', 'Brunch', 'Date night'],
      networkTrending: []
    });
  }
});

// Helper functions
function buildRestaurantSubtitle(restaurant: any): string {
  const parts = [];
  if (restaurant.category) parts.push(restaurant.category);
  if (restaurant.cuisine && restaurant.cuisine !== restaurant.category) parts.push(restaurant.cuisine);
  if (restaurant.priceRange) parts.push(restaurant.priceRange);
  if (restaurant.location) parts.push(restaurant.location);
  return parts.join(' • ') || 'Restaurant';
}

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export default router;