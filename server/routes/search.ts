import { Router } from 'express';
import { db } from '../db';
import { restaurants, restaurantLists, posts, users } from '../../shared/schema';
import { ilike, or, and, eq, desc } from 'drizzle-orm';
import { authenticate } from '../auth';
import { searchGooglePlaces } from '../services/google-places';
import { SearchEngineService } from '../services/search-engine';

const router = Router();

// Initialize search engine service
const searchEngine = SearchEngineService.getInstance();

// Unified search endpoint using advanced SearchEngineService with person name detection
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

    // Advanced search with person name detection and semantic expansion
    const searchOptions = {
      query: query,
      location: lat && lng ? {
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string)
      } : undefined,
      radius: radius ? parseInt(radius as string) : 10000,
      limit: limitNum,
      includeLocation: !!lat && !!lng,
      sortBy: 'relevance' as const,
      userId: req.user?.id
    };

    console.log(`🔍 Search route processing query: "${query}" with options:`, searchOptions);

    const results: any = {};

    // Search restaurants using advanced SearchEngineService
    if (!searchType || searchType === 'restaurants') {
      console.log(`🔍 ADVANCED SEARCH START: "${query}" with person name detection`);
      
      try {
        const restaurantResults = await searchEngine.search(searchOptions);
        
        // Transform advanced search results to match API contract
        results.restaurants = restaurantResults.map((result: any) => ({
          id: result.id.includes('google_') ? result.id : parseInt(result.id),
          name: result.name,
          address: result.location?.address || result.metadata?.address,
          city: result.location?.city || result.metadata?.city || result.metadata?.location,
          cuisine: result.metadata?.cuisine || result.metadata?.category,
          priceRange: result.metadata?.priceRange,
          imageUrl: result.metadata?.imageUrl,
          googlePlaceId: result.metadata?.googlePlaceId,
          verified: result.metadata?.verified || result.metadata?.source === 'google_places',
          source: result.metadata?.source || 'database',
          rating: result.metadata?.rating,
          distance: result.location?.distance,
          relevanceScore: result.relevanceScore
        }));
        
        console.log(`🎯 Advanced search results: ${results.restaurants.length} restaurants with relevance scoring`);
        console.log(`📈 Top result: ${results.restaurants[0]?.name} (score: ${results.restaurants[0]?.relevanceScore})`);
      } catch (error) {
        console.error('❌ ADVANCED SEARCH ERROR, falling back to basic search:', error);
        
        // Fallback to basic search if advanced search fails
        const basicResults = await db
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
              ilike(restaurants.name, `%${query.trim()}%`),
              ilike(restaurants.address, `%${query.trim()}%`),
              ilike(restaurants.city, `%${query.trim()}%`),
              ilike(restaurants.cuisine, `%${query.trim()}%`)
            )
          )
          .orderBy(desc(restaurants.verified), restaurants.name)
          .limit(limitNum);
          
        results.restaurants = basicResults;
      }
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
              ilike(restaurantLists.name, `%${query.trim()}%`),
              ilike(restaurantLists.description, `%${query.trim()}%`)
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
            ilike(posts.content, `%${query.trim()}%`),
            eq(posts.visibility, 'public') // Only show public posts in search
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      results.posts = postResults;
    }

    // Search users - DIRECT DB QUERY TO PREVENT RESTAURANT MIXING
    if (!searchType || searchType === 'users') {
      console.log(`🔍 Searching users with direct DB query: "${query}"`);
      
      // BYPASS SearchEngineService completely to prevent restaurant mixing
      const userResults = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          bio: users.bio,
          profilePicture: users.profilePicture
        })
        .from(users)
        .where(
          or(
            ilike(users.username, `%${query.trim()}%`),
            ilike(users.name, `%${query.trim()}%`),
            ilike(users.bio, `%${query.trim()}%`)
          )
        )
        .orderBy(users.name)
        .limit(limitNum)
        .offset(offsetNum);
        
      results.users = userResults.map(user => ({
        ...user,
        relevanceScore: 80
      }));
      
      console.log(`👥 Direct DB user search: ${results.users.length} users found`);
      if (results.users.length > 0) {
        console.log('User results:', results.users.map((u: any) => ({ id: u.id, name: u.name, username: u.username })));
      }
    }

    // Calculate total counts for pagination
    const totalCounts: any = {};
    if (results.restaurants) totalCounts.restaurants = results.restaurants.length;
    if (results.lists) totalCounts.lists = results.lists.length;
    if (results.posts) totalCounts.posts = results.posts.length;
    if (results.users) totalCounts.users = results.users.length;

    // Return results in both formats for compatibility
    res.json({
      // New format with results wrapper
      results,
      // Legacy format for backwards compatibility
      restaurants: results.restaurants || [],
      lists: results.lists || [],
      posts: results.posts || [],
      users: results.users || [],
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

// Quick restaurant search for autocomplete using advanced SearchEngineService
router.get('/restaurants', authenticate, async (req, res) => {
  try {
    const { q, limit = 10, lat, lng } = req.query;
    const query = q as string;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    // Use advanced search for restaurant autocomplete
    const searchOptions = {
      location: lat && lng ? {
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string)
      } : undefined,
      limit: parseInt(limit as string) || 10,
      includeLocation: !!lat && !!lng,
      sortBy: 'relevance' as const,
      userId: req.user?.id
    };

    try {
      const advancedResults = await searchEngine.search({ ...searchOptions });
      
      // Transform to match autocomplete API contract
      const transformedResults = advancedResults.map((result: any) => ({
        id: result.id.includes('google_') ? result.id : parseInt(result.id),
        name: result.name,
        address: result.location?.address || result.metadata?.address,
        city: result.location?.city || result.metadata?.city || result.metadata?.location,
        cuisine: result.metadata?.cuisine || result.metadata?.category,
        imageUrl: result.metadata?.imageUrl,
        googlePlaceId: result.metadata?.googlePlaceId,
        relevanceScore: result.relevanceScore
      }));
      
      res.json(transformedResults);
    } catch (error) {
      console.error('Advanced restaurant search failed, using fallback:', error);
      
      // Fallback to basic search
      const basicResults = await db
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
            ilike(restaurants.name, `%${query.trim()}%`),
            ilike(restaurants.address, `%${query.trim()}%`),
            ilike(restaurants.city, `%${query.trim()}%`)
          )
        )
        .orderBy(restaurants.name)
        .limit(parseInt(limit as string) || 10);
        
      res.json(basicResults);
    }
  } catch (error) {
    console.error('Error searching restaurants:', error);
    res.status(500).json({ error: 'Restaurant search failed' });
  }
});

// User search endpoint for social features using advanced SearchEngineService
router.get('/users', authenticate, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const query = q as string;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    // Use advanced search with person name detection
    const searchOptions = {
      limit: parseInt(limit as string) || 10,
      userId: req.user?.id
    };

    try {
      const advancedResults = await searchEngine.search({ ...searchOptions });
      
      // Transform to match user search API contract
      const transformedResults = advancedResults.map((result: any) => ({
        id: parseInt(result.id),
        username: result.metadata?.username,
        name: result.name,
        bio: result.metadata?.bio,
        profilePicture: result.metadata?.profilePicture,
        relevanceScore: result.relevanceScore
      }));
      
      res.json(transformedResults);
    } catch (error) {
      console.error('User search failed, using fallback:', error);
      
      // Fallback to basic search
      const basicResults = await db
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
            ilike(users.username, `%${query.trim()}%`),
            ilike(users.name, `%${query.trim()}%`),
            ilike(users.bio, `%${query.trim()}%`)
          )
        )
        .orderBy(users.name)
        .limit(parseInt(limit as string) || 10);
        
      res.json(basicResults);
    }
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

// List search endpoint
router.get('/lists', authenticate, async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    const query = q as string;
    const limitNum = parseInt(limit as string) || 20;
    const offsetNum = parseInt(offset as string) || 0;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const { db } = await import('../db');
    const { restaurantLists } = await import('../../shared/schema');
    const { ilike, and, eq, desc } = await import('drizzle-orm');

    const results = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        tags: restaurantLists.tags,
        createdById: restaurantLists.createdById,
        createdAt: restaurantLists.createdAt,
        coverImage: restaurantLists.coverImage
      })
      .from(restaurantLists)
      .where(
        and(
          ilike(restaurantLists.name, `%${query.trim()}%`),
          eq(restaurantLists.isPublic, true)
        )
      )
      .orderBy(desc(restaurantLists.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    res.json(results);
  } catch (error) {
    console.error('List search error:', error);
    res.status(500).json({ error: 'Failed to search lists' });
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

export default router;