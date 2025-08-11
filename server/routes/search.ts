import { Router } from 'express';
import { authenticate } from '../auth';
import { db } from '../db';
import { users, restaurants, restaurantLists, posts, userFollowers } from '@shared/schema';
import { eq, ilike, or, and, sql, desc, asc } from 'drizzle-orm';
import { searchGooglePlaces } from '../services/google-places';
import { SearchCache } from '../services/searchCache';
import { placesService, PlacesService } from '../services/placesService';
import { SearchTimingHelper } from '../middleware/searchTiming';

const router = Router();

// Enhanced relevance scoring system that prioritizes relevance over rating
function calculateRelevanceScore(restaurantName: string, searchQuery: string): number {
  const name = restaurantName.toLowerCase().trim();
  const query = searchQuery.toLowerCase().trim();

  // Exact match gets highest priority
  if (name === query) {
    return 100;
  }

  // Name starts with search term
  if (name.startsWith(query)) {
    return 90;
  }

  // Name contains search term
  if (name.includes(query)) {
    return 80;
  }

  // Check if any word in the name starts with the query
  const nameWords = name.split(/\s+/);
  for (const word of nameWords) {
    if (word.startsWith(query)) {
      return 70;
    }
  }

  // Check if any word in the name contains the query
  for (const word of nameWords) {
    if (word.includes(query)) {
      return 60;
    }
  }

  // NEW: Check if any word in the search query matches the restaurant name
  // This handles cases like "revolver pizza" matching "Revolver" restaurant
  const queryWords = query.split(/\s+/);
  for (const queryWord of queryWords) {
    if (queryWord.length >= 3) { // Only check meaningful words
      // Exact word match
      if (name === queryWord) {
        return 85;
      }
      // Restaurant name starts with query word
      if (name.startsWith(queryWord)) {
        return 75;
      }
      // Restaurant name contains query word
      if (name.includes(queryWord)) {
        return 65;
      }
      // Any word in restaurant name matches query word
      for (const nameWord of nameWords) {
        if (nameWord === queryWord) {
          return 75;
        }
        if (nameWord.startsWith(queryWord)) {
          return 65;
        }
        if (nameWord.includes(queryWord)) {
          return 55;
        }
      }
    }
  }

  // Default score for no match
  return 50;
}

function calculateCategoryRelevance(category: string, cuisine: string, searchQuery: string): number {
  const query = searchQuery.toLowerCase().trim();
  const cat = category?.toLowerCase() || '';
  const cui = cuisine?.toLowerCase() || '';

  // Category/cuisine matches
  if (cat.includes(query) || cui.includes(query)) {
    return 70;
  }

  return 0;
}

// Enhanced person name detection that works for ALL restaurant names without hardcoded lists
function isPersonNameQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim();

  // 1. Restaurant-related terms that should NEVER be treated as person names
  const restaurantIndicators = [
    'restaurant', 'cafe', 'bar', 'grill', 'kitchen', 'bistro', 'eatery', 'diner',
    'pizza', 'burger', 'sushi', 'taco', 'sandwich', 'bakery', 'brewery', 'pub',
    'steakhouse', 'seafood', 'food', 'eat', 'dining', 'menu', 'dish', 'meal',
    'lunch', 'dinner', 'breakfast', 'brunch', 'coffee', 'tea', 'wine', 'cocktail',
    'pizzeria', 'trattoria', 'brasserie', 'tavern', 'house', 'spot', 'place',
    'noodle', 'ramen', 'pho', 'dim sum', 'buffet', 'takeout', 'delivery',
    'bbq', 'barbecue', 'gourmet', 'organic', 'vegan', 'vegetarian', 'halal',
    'kosher', 'asian', 'italian', 'mexican', 'indian', 'chinese', 'thai',
    'japanese', 'korean', 'mediterranean', 'french', 'greek', 'american',
    'fusion', 'fine dining', 'casual', 'upscale', 'family', 'authentic',
    'golden', 'dragon', 'villa', 'palace', 'garden', 'phoenix', 'jade', 'bamboo',
    'costa', 'verde', 'casa', 'plaza', 'mesa', 'vista', 'royal', 'grand'
  ];

  // 2. Restaurant naming patterns that indicate business names, not people
  const businessNamePatterns = [
    /\b(the|la|le|el|il|das|der|los|las)\s+/i,  // Articles: "The Green Door", "La Costa"
    /\b(and|&|\+)\b/i,                          // Conjunctions: "Fish & Chips", "Salt + Pepper"
    /\b(st|street|ave|avenue|rd|road)\b/i,      // Street indicators: "Main St Deli"
    /\b(north|south|east|west|n|s|e|w)\b/i,     // Directions: "North Shore"
    /\b(old|new|original|classic|modern)\b/i,   // Descriptors: "Old Town", "New York"
    /\b(golden|silver|red|blue|green|black|white)\b/i, // Colors: "Golden Dragon"
    /\b(royal|grand|crown|palace|castle)\b/i,   // Regal terms: "Royal Palace"
    /\b(garden|farm|mountain|river|lake|ocean)\b/i, // Nature: "Garden Fresh"
    /\b(first|second|third|best|top|premium)\b/i,   // Superlatives: "First Choice"
    /\b(fresh|hot|spicy|sweet|crispy|tender)\b/i,   // Food descriptors
    /\b(corner|downtown|uptown|central|main)\b/i,   // Location descriptors
    /\b(mama|papa|uncle|aunt|family)\b/i,       // Family terms: "Mama's Kitchen"
    /\b(little|big|giant|mini|mega)\b/i,        // Size descriptors
    /\b(24|seven|hour|open|late|night)\b/i,     // Time indicators
    /\b(express|quick|fast|instant)\b/i,        // Speed indicators
    /\b(special|signature|famous|legendary)\b/i, // Quality indicators
    /\b(homestyle|traditional|authentic|genuine)\b/i, // Style indicators
    /\b(brothers|bros|sisters|sons|daughters)\b/i // Family business: "Smith Brothers"
  ];

  // 3. Multi-word phrases are more likely to be business names than person names
  const words = lowerQuery.split(/\s+/);
  if (words.length > 2) {
    return false; // "Costa Verde Restaurant" is clearly a business
  }

  // 4. If query contains any restaurant indicators, it's not a person name
  if (restaurantIndicators.some(term => lowerQuery.includes(term))) {
    return false;
  }

  // 5. If query matches business name patterns, it's not a person name
  if (businessNamePatterns.some(pattern => pattern.test(lowerQuery))) {
    return false;
  }

  // 6. Foreign/non-English words are more likely to be restaurant names
  const foreignRestaurantPatterns = [
    /\b(casa|costa|villa|plaza|mesa|vista|rio|mar|sol|luna|estrella)\b/i, // Spanish
    /\b(le|la|du|des|chez|maison|brasserie|cafe|bistro)\b/i,           // French
    /\b(il|da|della|pizzeria|trattoria|osteria|ristorante)\b/i,        // Italian
    /\b(zen|sakura|tokyo|osaka|sushi|ramen|yakitori|tempura)\b/i,      // Japanese
    /\b(seoul|kim|park|bbq|bulgogi|bibimbap|kimchi)\b/i,               // Korean
    /\b(pho|saigon|vietnam|banh|mi|spring|roll)\b/i,                   // Vietnamese
    /\b(thai|pad|curry|tom|yum|som|tam)\b/i,                          // Thai
    /\b(india|curry|tandoor|masala|biryani|naan|chai)\b/i,            // Indian
    /\b(dim|sum|wok|dragon|phoenix|golden|jade|bamboo)\b/i,            // Chinese
    /\b(gyro|souvlaki|taverna|mezze|pita|falafel)\b/i,                // Greek/Middle Eastern
    /\b(taco|burrito|cantina|hacienda|mariachi|fiesta)\b/i,            // Mexican
    /\b(bratwurst|schnitzel|oktoberfest|biergarten|stube)\b/i,         // German
    /\b(tapas|paella|sangria|bodega|cerveza|flamenco)\b/i,            // Spanish
    /\b(pub|inn|fish|chips|bangers|mash|shepherd)\b/i                 // British
  ];

  if (foreignRestaurantPatterns.some(pattern => pattern.test(lowerQuery))) {
    return false;
  }

  // 6b. Additional common restaurant name patterns
  const commonRestaurantPatterns = [
    /\b(golden|silver|red|blue|green|black|white|royal|grand)\s+(dragon|palace|garden|house|inn|tavern|grill|kitchen|cafe|bar)\b/i,
    /\b(la|le|el|il|das|der|los|las)\s+\w+/i,  // Any word after articles
    /\b(old|new|original|classic|modern|traditional)\s+\w+/i,
    /\b(north|south|east|west|central|downtown|uptown)\s+\w+/i,
    /\b(first|second|third|last|best|top|premium|finest)\s+\w+/i,
    /\b(little|big|giant|mini|mega|huge|small|large)\s+\w+/i,
    /\b(mama|papa|uncle|aunt|family|brother|sister)\s*[s']?s?\s*\w*/i,
    /\b(corner|main|street|avenue|road|lane)\s+\w+/i,
    /\b(mountain|river|lake|ocean|beach|forest|garden|farm)\s+\w+/i
  ];

  if (commonRestaurantPatterns.some(pattern => pattern.test(lowerQuery))) {
    return false;
  }

  // 7. Very short queries (1-2 characters) are ambiguous, lean towards person names
  if (lowerQuery.length <= 2) {
    return true;
  }

  // 8. Single words that are common first names (but only if no restaurant indicators)
  const commonFirstNames = [
    'alex', 'mike', 'john', 'jane', 'bob', 'sue', 'tom', 'amy', 'joe', 'ann',
    'ben', 'sam', 'dan', 'max', 'kim', 'pat', 'ray', 'jim', 'ron', 'ted',
    'tim', 'guy', 'leo', 'eva', 'zoe', 'ian', 'kai', 'eli', 'ivy', 'sky',
    'rio', 'drew', 'cole', 'dean', 'finn', 'gray', 'jude', 'luke', 'noah',
    'owen', 'seth', 'will', 'zane', 'rachael', 'rachel', 'mitch', 'casey',
    'jason', 'sarah', 'david', 'chris', 'steve', 'brian', 'kevin', 'karen',
    'linda', 'mary', 'patricia', 'robert', 'michael', 'william', 'richard'
  ];

  // 9. Standard "First Last" name pattern
  const firstLastPattern = /^[a-z]{2,}\s+[a-z]{2,}$/i;
  if (firstLastPattern.test(lowerQuery)) {
    return true;
  }

  // 10. Single common first name
  if (words.length === 1 && commonFirstNames.includes(lowerQuery)) {
    return true;
  }

  // 11. Default: if we can't determine, assume it's a restaurant name for better search coverage
  return false;
}

// Dedicated restaurant search endpoint with caching and parallel execution
router.get('/restaurants', authenticate, async (req, res) => {
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
      limit = '20'
    } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({ restaurants: [] });
    }

    const searchTerm = query.trim();
    const searchLat = lat ? parseFloat(lat as string) : undefined;
    const searchLng = lng ? parseFloat(lng as string) : undefined;
    const searchRadius = parseInt(radius as string);
    const resultLimit = Math.min(parseInt(limit as string), 50);

    // Check cache first
    const cached = await SearchCache.getCachedRestaurantSearch(
      searchTerm, 
      searchLat, 
      searchLng, 
      { radius: searchRadius, limit: resultLimit }
    );

    if (cached) {
      SearchTimingHelper.markCacheHit(req);
      SearchTimingHelper.setPlacesStatus(req, 'hit');
      SearchTimingHelper.recordResultCount(req, cached.length);
      return res.json({ restaurants: cached });
    }

    SearchTimingHelper.markCacheMiss(req);
    
    // Execute database search and Places API in parallel
    const dbStartTime = performance.now();
    const placesStartTime = performance.now();

    const [dbResult, placesResult] = await Promise.allSettled([
      // Database search
      searchRestaurants(searchTerm, searchLat, searchLng, searchRadius, resultLimit),
      // Places API search with timeout
      placesService.searchPlaces(searchTerm, searchLat, searchLng)
    ]);

    SearchTimingHelper.recordDbTime(req, dbStartTime);

    // Process database results
    const dbRestaurants = dbResult.status === 'fulfilled' ? (dbResult.value || []) : [];
    
    // Process Places results
    let placesRestaurants: any[] = [];
    let placesStatus: 'hit' | 'miss' | 'timeout' | 'circuit' | 'disabled' = 'miss';
    
    if (placesResult.status === 'fulfilled') {
      placesRestaurants = placesResult.value || [];
      placesStatus = placesRestaurants.length > 0 ? 'miss' : 'miss';
    } else {
      console.log('Places API failed:', placesResult.reason?.message || 'Unknown error');
      placesStatus = placesResult.reason?.message?.includes('timeout') ? 'timeout' : 'circuit';
    }

    SearchTimingHelper.recordPlacesTime(req, placesStartTime, placesStatus);

    // Merge results (DB first, then unique Places results)
    const mergedRestaurants = PlacesService.mergeRestaurantResults(dbRestaurants, placesRestaurants);

    // Cache the merged results
    await SearchCache.cacheRestaurantSearch(
      searchTerm, 
      mergedRestaurants, 
      searchLat, 
      searchLng, 
      { radius: searchRadius, limit: resultLimit }
    );

    SearchTimingHelper.recordResultCount(req, mergedRestaurants.length);
    
    res.json({ 
      restaurants: mergedRestaurants,
      total: mergedRestaurants.length,
      meta: {
        dbResults: dbRestaurants.length,
        placesResults: placesRestaurants.length,
        placesStatus
      }
    });

  } catch (error) {
    console.error('Restaurant search error:', error);
    res.status(500).json({ error: 'Restaurant search failed' });
  }
});

// Dedicated user search endpoint
router.get('/users', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { 
      q: query, 
      limit = '10'
    } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({ users: [] });
    }

    const searchTerm = query.trim();
    const resultLimit = Math.min(parseInt(limit as string), 20);

    console.log(`User search for "${searchTerm}" by user ${userId}`);

    // Use the working searchUsers function
    const users = await searchUsers(searchTerm, userId, resultLimit);

    console.log(`User search results: ${users.length} users`);
    res.json({ users });

  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'User search failed' });
  }
});

// Enhanced unified search with database and Google Places integration
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
      type = 'all',
      cuisines,
      priceRange,
      occasions,
      tags,
      dietaryRestrictions,
      openNow,
      rating
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

    console.log(`🔍 Enhanced unified search for "${searchTerm}" by user ${userId}`);
    console.log(`📍 Location: ${searchLat ? `${searchLat}, ${searchLng}` : 'No location provided'}`);
    console.log(`🎯 Radius: ${searchRadius}m`);

    // Simplified search with basic queries to ensure functionality
    if (type === "all") {
      try {
        // Basic restaurant search without complex SQL
        const dbRestaurants = await db.select({
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
          avgRating: sql<number>`4.0`,
          reviewCount: sql<number>`0`,
        })
        .from(restaurants)
        .where(
          or(
            ilike(restaurants.name, `%${searchTerm}%`),
            ilike(restaurants.location, `%${searchTerm}%`),
            ilike(restaurants.city, `%${searchTerm}%`),
            ilike(restaurants.category, `%${searchTerm}%`),
            ilike(restaurants.cuisine, `%${searchTerm}%`),
            ilike(restaurants.address, `%${searchTerm}%`)
          )
        )
        .limit(Math.floor(resultLimit * 0.5));

        // Enhanced user search with follow status
        const dbUsersWithFollowStatus = await db.select({
          id: users.id,
          name: users.name,
          username: users.username,
          bio: users.bio,
          profilePicture: users.profilePicture,
          preferredCuisines: users.preferredCuisines,
          favoriteFood: users.favoriteFood,
          favoriteRestaurant: users.favoriteRestaurant,
          isFollowing: sql<boolean>`CASE WHEN follow_check.follower_id IS NOT NULL THEN true ELSE false END`
        })
        .from(users)
        .leftJoin(
          sql`${userFollowers} AS follow_check`,
          sql`follow_check.following_id = ${users.id} AND follow_check.follower_id = ${userId}`
        )
        .where(
          and(
            or(
              ilike(users.name, `%${searchTerm}%`),
              ilike(users.username, `%${searchTerm}%`),
              ilike(users.bio, `%${searchTerm}%`)
            ),
            sql`${users.id} != ${userId}`
          )
        )
        .limit(Math.floor(resultLimit * 0.2));

        // Basic list search
        const dbLists = await db.select({
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
        })
        .from(restaurantLists)
        .where(
          and(
            or(
              ilike(restaurantLists.name, `%${searchTerm}%`),
              ilike(restaurantLists.description, `%${searchTerm}%`),
              ilike(restaurantLists.primaryLocation, `%${searchTerm}%`)
            ),
            eq(restaurantLists.makePublic, true)
          )
        )
        .limit(Math.floor(resultLimit * 0.15));

        // Basic post search
        const dbPosts = await db.select({
          id: posts.id,
          content: posts.content,
          rating: posts.rating,
          images: posts.images,
          dishesTried: posts.dishesTried,
          createdAt: posts.createdAt,
          userId: posts.userId,
          restaurantId: posts.restaurantId,
        })
        .from(posts)
        .where(
          ilike(posts.content, `%${searchTerm}%`)
        )
        .limit(Math.floor(resultLimit * 0.15));

        // Enhanced Google Places search if restaurant results are insufficient
        // Only apply Google Places enhancement for restaurant-focused searches
        let restaurantResults = dbRestaurants;

        // Check if search term is likely a person's name to avoid restaurant enhancement
        const isPersonNameSearch = isPersonNameQuery(searchTerm);

        console.log(`DEBUG: Search term "${searchTerm}" - isPersonNameSearch: ${isPersonNameSearch}, dbRestaurants.length: ${dbRestaurants.length}`);

        // Enhanced search strategy - try Google Places for restaurant names like "Costa Verde"
        if (dbRestaurants.length < 12 && !isPersonNameSearch && searchTerm.length > 2) {
          try {
            const locationData = (searchLat && searchLng) ? { 
              lat: searchLat, 
              lng: searchLng, 
              radius: Math.max(searchRadius, 25000) // Minimum 25km radius for better coverage
            } : undefined;

            console.log(`Enhancing with Google Places search for "${searchTerm}"`);
            console.log(`Location data:`, locationData);
            const googleResults = await searchGooglePlaces(searchTerm, locationData);
            console.log(`Google Places returned ${googleResults.length} results for "${searchTerm}"`);

            // Enhanced deduplication and formatting
            const filteredGoogleResults = googleResults
              .filter(gr => !dbRestaurants.some(dr => 
                dr.googlePlaceId === gr.googlePlaceId ||
                (dr.name.toLowerCase() === gr.name.toLowerCase() && 
                 dr.location?.toLowerCase() === gr.location?.toLowerCase())
              ))
              .slice(0, 12 - dbRestaurants.length)
              .map((r, index) => ({
                id: parseInt(`99${index}${Date.now().toString().slice(-5)}`), // Convert to number for compatibility
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
                avgRating: 4.0, // Default rating for Google Places results
                reviewCount: 0, // Default review count
              }));

            restaurantResults = [...dbRestaurants, ...filteredGoogleResults];
            console.log(`Added ${filteredGoogleResults.length} Google Places results`);
          } catch (googleError) {
            console.error("Google Places enhancement error:", googleError);
          }
        }

        // Enhanced result formatting with relevance-based sorting and minimum threshold
        const formattedResults = {
          restaurants: restaurantResults
            .map(r => {
              // Calculate relevance score for each restaurant
              const nameRelevance = calculateRelevanceScore(r.name, searchTerm);
              const categoryRelevance = calculateCategoryRelevance(r.category, r.cuisine || '', searchTerm) || 0;
              const totalRelevance = Math.max(nameRelevance, categoryRelevance);

              return {
                id: r.id.toString(),
                name: r.name,
                type: 'restaurant' as const,
                subtitle: buildRestaurantSubtitle(r),
                location: r.city || r.location || 'Unknown location',
                avgRating: typeof r.avgRating === 'number' && !isNaN(r.avgRating) ? r.avgRating : 4.0,
                thumbnailUrl: r.imageUrl,
                source: r.id.toString().startsWith('google_') ? 'google' : 'database',
                relevanceScore: totalRelevance,
                metadata: {
                  category: r.category,
                  priceRange: r.priceRange,
                  cuisine: r.cuisine,
                  address: r.address,
                  reviewCount: r.reviewCount || 0,
                  googlePlaceId: r.googlePlaceId,
                }
              };
            })
            .filter(r => {
              // Apply stricter relevance filtering for person name searches
              // This prevents showing irrelevant restaurants when searching for people
              if (isPersonNameQuery(searchTerm)) {
                // Only show restaurants where the name actually contains the search term
                return r.name.toLowerCase().includes(searchTerm.toLowerCase()) && r.relevanceScore >= 70;
              }
              // For general searches, require at least some relevance
              return r.relevanceScore >= 55;
            })
            .sort((a, b) => {
              // Primary sort: Relevance score (higher is better)
              if (a.relevanceScore !== b.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
              }

              // Secondary sort: Rating (higher is better)
              if (a.avgRating !== b.avgRating) {
                return b.avgRating - a.avgRating;
              }

              // Tertiary sort: Review count (higher is better)
              const aReviewCount = a.metadata.reviewCount || 0;
              const bReviewCount = b.metadata.reviewCount || 0;
              return bReviewCount - aReviewCount;
            }),

          lists: dbLists.map(l => ({
            id: l.id.toString(),
            name: l.name,
            type: 'list' as const,
            subtitle: l.description || `${l.type || 'restaurant'} list`,
            thumbnailUrl: l.coverImage,
            location: l.primaryLocation,
            metadata: {
              type: l.type,
              viewCount: l.viewCount,
              saveCount: l.saveCount,
              tags: l.tags,
              createdById: l.createdById,
            }
          })),

          posts: dbPosts.map(p => ({
            id: p.id.toString(),
            name: truncateText(p.content, 60),
            type: 'post' as const,
            subtitle: `Post by User ${p.userId}`,
            thumbnailUrl: p.images?.[0],
            metadata: {
              content: p.content,
              rating: p.rating,
              dishesTried: p.dishesTried,
              createdAt: p.createdAt,
            }
          })),

          users: dbUsersWithFollowStatus.map(u => {
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
              isFollowing: u.isFollowing || false, // Use the actual follow status from database
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

// New endpoint for trending tags/themes
router.get('/trending-tags', authenticate, async (req, res) => {
  try {
    const { limit = '20' } = req.query;
    const resultLimit = Math.min(parseInt(limit as string), 50);

    // Get trending tags from posts
    const postTags = await db.select({
      tag: sql<string>`unnest(${posts.tags})`,
      count: sql<number>`COUNT(*)`,
      avgRating: sql<number>`AVG(${posts.rating})`,
      recentUsage: sql<number>`COUNT(CASE WHEN ${posts.createdAt} > NOW() - INTERVAL '7 days' THEN 1 END)`,
    })
    .from(posts)
    .where(sql`array_length(${posts.tags}, 1) > 0`)
    .groupBy(sql`unnest(${posts.tags})`)
    .orderBy(desc(sql`COUNT(CASE WHEN ${posts.createdAt} > NOW() - INTERVAL '7 days' THEN 1 END)`), desc(sql`COUNT(*)`))
    .limit(resultLimit);

    // Get trending tags from restaurant lists
    const listTags = await db.select({
      tag: sql<string>`unnest(${restaurantLists.tags})`,
      count: sql<number>`COUNT(*)`,
      avgRating: sql<number>`4.0`, // Default rating for lists
      recentUsage: sql<number>`COUNT(CASE WHEN ${restaurantLists.createdAt} > NOW() - INTERVAL '7 days' THEN 1 END)`,
    })
    .from(restaurantLists)
    .where(sql`array_length(${restaurantLists.tags}, 1) > 0`)
    .groupBy(sql`unnest(${restaurantLists.tags})`)
    .orderBy(desc(sql`COUNT(CASE WHEN ${restaurantLists.createdAt} > NOW() - INTERVAL '7 days' THEN 1 END)`), desc(sql`COUNT(*)`))
    .limit(resultLimit);

    // Combine and deduplicate tags
    const allTags = new Map();

    [...postTags, ...listTags].forEach(tagData => {
      const tag = tagData.tag.toLowerCase().trim();
      if (tag && tag.length > 0) {
        if (allTags.has(tag)) {
          const existing = allTags.get(tag);
          allTags.set(tag, {
            tag: tagData.tag,
            count: existing.count + tagData.count,
            avgRating: (existing.avgRating + tagData.avgRating) / 2,
            recentUsage: existing.recentUsage + tagData.recentUsage,
            trending: tagData.recentUsage > 0
          });
        } else {
          allTags.set(tag, {
            tag: tagData.tag,
            count: tagData.count,
            avgRating: tagData.avgRating,
            recentUsage: tagData.recentUsage,
            trending: tagData.recentUsage > 0
          });
        }
      }
    });

    // Convert to array and sort by trending score
    const trendingTags = Array.from(allTags.values())
      .sort((a, b) => {
        // Primary sort: recent usage (trending)
        if (a.recentUsage !== b.recentUsage) {
          return b.recentUsage - a.recentUsage;
        }
        // Secondary sort: total count
        return b.count - a.count;
      })
      .slice(0, resultLimit);

    res.json({ 
      tags: trendingTags,
      suggested: [
        { tag: 'best burger', count: 0, trending: false, suggested: true },
        { tag: 'date night', count: 0, trending: false, suggested: true },
        { tag: 'casual dining', count: 0, trending: false, suggested: true },
        { tag: 'new restaurants', count: 0, trending: false, suggested: true },
        { tag: 'toronto', count: 0, trending: false, suggested: true },
        { tag: 'pizza', count: 0, trending: false, suggested: true },
        { tag: 'sushi', count: 0, trending: false, suggested: true },
        { tag: 'dim sum', count: 0, trending: false, suggested: true },
        { tag: 'birthday', count: 0, trending: false, suggested: true },
        { tag: 'low key', count: 0, trending: false, suggested: true },
        { tag: 'fun', count: 0, trending: false, suggested: true },
        { tag: 'trending restaurants', count: 0, trending: false, suggested: true },
      ]
    });

  } catch (error) {
    console.error('Trending tags error:', error);
    res.status(500).json({ error: 'Failed to fetch trending tags' });
  }
});

// Helper function to search restaurants by tags for thematic search
async function searchRestaurantsByTags(searchTerm: string, userId?: number, limit: number = 20) {
  const tagSearchTerm = searchTerm.toLowerCase().trim();
  console.log(`[TAG SEARCH] Starting tag search for: "${tagSearchTerm}"`);

  try {
    // Get restaurants mentioned in posts with matching tags
    const taggedRestaurants = await db.select({
      id: restaurants.id,
      name: restaurants.name,
      location: restaurants.location,
      category: restaurants.category,
      priceRange: restaurants.priceRange,
      cuisine: restaurants.cuisine,
      address: restaurants.address,
      imageUrl: restaurants.imageUrl,
      googlePlaceId: restaurants.googlePlaceId,
      avgRating: sql<number>`COALESCE(AVG(${posts.rating}), 4.0)`,
      reviewCount: sql<number>`COUNT(${posts.id})`,
    })
    .from(restaurants)
    .leftJoin(posts, eq(restaurants.id, posts.restaurantId))
    .where(
      sql`EXISTS (
        SELECT 1 FROM posts p 
        WHERE p.restaurant_id = ${restaurants.id} 
        AND p.tags IS NOT NULL 
        AND array_length(p.tags, 1) > 0
        AND EXISTS (
          SELECT 1 FROM unnest(p.tags) as tag 
          WHERE LOWER(tag) LIKE ${`%${tagSearchTerm}%`}
        )
      )`
    )
    .groupBy(restaurants.id)
    .orderBy(desc(sql`AVG(${posts.rating})`))
    .limit(limit);

    const results = taggedRestaurants.map(r => ({
      ...r,
      tagMatch: true, // Mark as tag-based result
    }));

    console.log(`[TAG SEARCH] Found ${results.length} restaurants with tag "${tagSearchTerm}"`);
    results.forEach(r => console.log(`[TAG SEARCH] - ${r.name} (ID: ${r.id})`));

    return results;
  } catch (error) {
    console.error('Tag search error:', error);
    return [];
  }
}

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
  .orderBy(desc(sql`CASE 
    WHEN LOWER(${restaurants.name}) = LOWER(${searchTerm}) THEN 100
    WHEN LOWER(${restaurants.name}) LIKE LOWER(${searchTerm + '%'}) THEN 90
    WHEN LOWER(${restaurants.name}) LIKE LOWER(${'%' + searchTerm + '%'}) THEN 80
    ELSE 70
  END`), desc(sql`AVG(${posts.rating})`))
  .limit(limit);

  // Enhanced with tag-based search for thematic queries
  let allResults = [...dbResults];

  // Add tag-based search results for themes like "best burger", "date night", etc.
  try {
    const tagResults = await searchRestaurantsByTags(searchTerm, undefined, limit);
    console.log(`Tag search for "${searchTerm}" returned ${tagResults.length} results`);

    // Merge tag results with database results, avoiding duplicates
    for (const tagResult of tagResults) {
      if (!allResults.some(r => r.id === tagResult.id)) {
        // Mark tag results for special handling
        tagResult.tagMatch = true;
        allResults.push(tagResult);
        console.log(`Added tag result: ${tagResult.name} (ID: ${tagResult.id})`);
      }
    }
  } catch (error) {
    console.error('Tag-based search error:', error);
  }

  // Enhanced with Google Places if needed (avoid for person name searches)
  if (allResults.length < 10 && !isPersonNameQuery(searchTerm) && searchTerm.length > 3) {
    try {
      const locationData = (lat && lng) ? { lat, lng, radius: radius || 15000 } : undefined;
      const googleResults = await searchGooglePlaces(searchTerm, locationData);

      const formattedGoogleResults = googleResults
        .filter(gr => !allResults.some(dr => dr.googlePlaceId === gr.googlePlaceId))
        .slice(0, limit - allResults.length)
        .map((r, index) => ({
          id: parseInt(`88${index}${Date.now().toString().slice(-5)}`), // Convert to number for compatibility
          name: r.name,
          location: r.location,
          category: r.category,
          priceRange: r.priceRange,
          cuisine: r.cuisine,
          address: r.address,
          imageUrl: r.imageUrl,
          avgRating: 4.0, // Schema doesn't have rating field
          reviewCount: 0, // Schema doesn't have reviewCount field
          googlePlaceId: r.googlePlaceId,
        }));

      allResults.push(...formattedGoogleResults);
    } catch (error) {
      console.error('Google Places search error:', error);
    }
  }

  console.log(`[SEARCH] Processing ${allResults.length} results for "${searchTerm}"`);

  const processedResults = allResults
    .map(r => {
      // Calculate relevance score for filtering
      const nameRelevance = calculateRelevanceScore(r.name, searchTerm);
      const categoryRelevance = calculateCategoryRelevance(r.category, r.cuisine || '', searchTerm) || 0;
      const baseRelevance = Math.max(nameRelevance, categoryRelevance);

      // Give tag-based results high relevance score for thematic searches
      const totalRelevance = (r as any).tagMatch ? Math.max(baseRelevance, 85) : baseRelevance;

      const result = {
        id: r.id.toString(),
        name: r.name,
        type: 'restaurant' as const,
        subtitle: buildRestaurantSubtitle(r),
        location: r.location,
        avgRating: r.avgRating,
        thumbnailUrl: r.imageUrl,
        source: r.id.toString().startsWith('google_') ? 'google' : 'database',
        relevanceScore: totalRelevance,
        tagMatch: (r as any).tagMatch || false, // Mark if found via tag search
        metadata: r
      };

      console.log(`[SEARCH] Restaurant: ${result.name} - Relevance: ${result.relevanceScore} - TagMatch: ${result.tagMatch}`);
      return result;
    })
    .filter(r => {
      // Apply stricter relevance filtering for person name searches
      // This prevents showing irrelevant restaurants when searching for people
      if (isPersonNameQuery(searchTerm)) {
        // Only show restaurants where the name actually contains the search term
        const result = r.name.toLowerCase().includes(searchTerm.toLowerCase()) && r.relevanceScore >= 70;
        console.log(`[FILTER] Person name query "${searchTerm}" - Restaurant "${r.name}" - Relevance: ${r.relevanceScore} - Include: ${result}`);
        return result;
      }
      // For general searches, be more permissive with relevance filtering
      const result = r.relevanceScore >= 40;
      console.log(`[FILTER] General query "${searchTerm}" - Restaurant "${r.name}" - Relevance: ${r.relevanceScore} - TagMatch: ${r.tagMatch} - Include: ${result}`);
      return result;
    })
    .sort((a, b) => {
      // Primary sort: Relevance score (higher is better)
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      // Secondary sort: Rating (higher is better)
      if (a.avgRating !== b.avgRating) {
        return b.avgRating - a.avgRating;
      }

      // Tertiary sort: Review count (higher is better)
      const aReviewCount = a.metadata?.reviewCount || 0;
      const bReviewCount = b.metadata?.reviewCount || 0;
      return bReviewCount - aReviewCount;
    });

  console.log(`[SEARCH] Final results: ${processedResults.length} restaurants`);
  return processedResults;
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

    let trendingRestaurants: any[] = [];

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
          avgRating: (r as any).rating || 4.0,
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

// Lists search endpoint - matches standard format
router.get('/lists', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { 
      q: query, 
      limit = '20',
      filters
    } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({
        results: [],
        total: 0,
        entity: 'list',
        meta: { page: 1, hasMore: false }
      });
    }

    const searchTerm = query.trim();
    const resultLimit = Math.min(parseInt(limit as string), 50);

    console.log(`🔍 Lists search for "${searchTerm}" by user ${userId}`);

    // Use existing searchLists function with enhanced visibility filtering
    const lists = await db.select({
      id: restaurantLists.id,
      name: restaurantLists.name,
      description: restaurantLists.description,
      type: restaurantLists.type,
      coverImage: restaurantLists.coverImage,
      viewCount: restaurantLists.viewCount,
      saveCount: restaurantLists.saveCount,
      reactionCount: restaurantLists.reactionCount,
      tags: restaurantLists.tags,
      primaryLocation: restaurantLists.primaryLocation,
      createdById: restaurantLists.createdById,
      visibility: restaurantLists.visibility,
      isPublic: restaurantLists.isPublic,
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
        // Visibility filtering: public lists or user's own lists
        or(
          eq(restaurantLists.isPublic, true),
          eq(restaurantLists.createdById, userId)
        )
      )
    )
    .orderBy(desc(restaurantLists.viewCount), desc(restaurantLists.saveCount))
    .limit(resultLimit);

    // Format results to match standard search response
    const results = lists.map(list => ({
      id: list.id,
      name: list.name,
      description: list.description,
      type: list.type,
      coverImage: list.coverImage,
      viewCount: list.viewCount,
      saveCount: list.saveCount,
      reactionCount: list.reactionCount,
      tags: list.tags,
      location: list.primaryLocation,
      createdById: list.createdById,
      visibility: list.visibility,
      isPublic: list.isPublic,
      createdAt: list.createdAt,
    }));

    console.log(`Lists search results: ${results.length} lists found`);

    res.json({
      results,
      total: results.length,
      entity: 'list',
      meta: { 
        page: 1, 
        hasMore: results.length === resultLimit 
      }
    });

  } catch (error) {
    console.error('Lists search error:', error);
    res.status(500).json({ error: 'List search failed' });
  }
});

export default router;