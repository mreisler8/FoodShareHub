import { Client } from 'typesense';
import { Restaurant, User, RestaurantList } from '@shared/schema';

// Initialize Typesense client
const typesense = new Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 10,
});

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
    'costa verde', 'costa', 'verde', 'oddseoul', 'odd seoul', 'badiali', 'pizzeria badiali', 
    'veselka', 'katz deli', 'russ daughters', 'peter luger', 'grammercy tavern',
    'earls kitchen', 'louix louis', 'pai', 'canoe', 'alo', 'buca', 'scaramouche'
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

// Centralized person name detection to ensure consistency across all search functions
function isPersonNameQueryOld(searchTerm: string): boolean {
  // Updated to exclude known restaurant terms like "odds" (OddSeoul)
  const restaurantTerms = ['odds', 'oddseoul', 'pizza', 'burger', 'sushi', 'taco', 'cafe', 'bar', 'grill', 'kitchen', 'house', 'spot', 'place', 'bistro', 'eatery', 'diner', 'restaurant', 'food', 'cuisine', 'dining', 'menu', 'eat', 'taste', 'flavor', 'spicy', 'sweet', 'meal', 'lunch', 'dinner', 'breakfast', 'brunch'];

  return /^[a-zA-Z]+(\s[a-zA-Z]+)?$/.test(searchTerm) && 
         searchTerm.length <= 20 && 
         !searchTerm.toLowerCase().includes('restaurant') &&
         !searchTerm.toLowerCase().includes('food') &&
         !searchTerm.toLowerCase().includes('cuisine') &&
         !restaurantTerms.some(term => searchTerm.toLowerCase().includes(term));
}

// Semantic search mappings
const SEMANTIC_MAPPINGS = {
  'late night': ['open late', 'nightlife', 'after hours', 'late dining'],
  'brunch': ['breakfast', 'lunch', 'weekend dining', 'morning'],
  'date night': ['romantic', 'intimate', 'fine dining', 'wine bar'],
  'family friendly': ['kids', 'children', 'casual', 'family'],
  'quick bite': ['fast', 'takeout', 'grab and go', 'quick service'],
  'healthy': ['salad', 'organic', 'vegetarian', 'vegan', 'fresh'],
  'comfort food': ['hearty', 'home style', 'traditional', 'warming'],
} as const;

interface SearchOptions {
  query: string;
  lat?: number;
  lng?: number;
  radius?: number;
  userId?: number;
  filters?: {
    priceRange?: string[];
    cuisine?: string[];
    tags?: string[];
  };
}

interface EnhancedSearchResult {
  id: string;
  name: string;
  type: 'restaurant' | 'list' | 'user' | 'post';
  relevanceScore: number;
  location?: {
    distance?: number;
    city?: string;
    address?: string;
  };
  metadata: any;
}

export class SearchEngineService {
  private static instance: SearchEngineService;

  public static getInstance(): SearchEngineService {
    if (!SearchEngineService.instance) {
      SearchEngineService.instance = new SearchEngineService();
    }
    return SearchEngineService.instance;
  }

  async initializeCollections() {
    // Restaurant collection schema
    const restaurantSchema = {
      name: 'restaurants',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'cuisine', type: 'string' },
        { name: 'priceRange', type: 'string' },
        { name: 'tags', type: 'string[]' },
        { name: 'description', type: 'string', optional: true },
        { name: 'geopoint', type: 'geopoint', optional: true },
        { name: 'rating', type: 'float', optional: true },
        { name: 'verified', type: 'bool' },
        { name: 'popularity_score', type: 'int32' },
      ],
    };

    // User collection schema
    const userSchema = {
      name: 'users',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'username', type: 'string' },
        { name: 'bio', type: 'string', optional: true },
        { name: 'preferredCuisines', type: 'string[]' },
        { name: 'diningInterests', type: 'string[]' },
        { name: 'location', type: 'string', optional: true },
        { name: 'follower_count', type: 'int32' },
      ],
    };

    // List collection schema
    const listSchema = {
      name: 'lists',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'tags', type: 'string[]' },
        { name: 'createdById', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'primaryLocation', type: 'string', optional: true },
        { name: 'geopoint', type: 'geopoint', optional: true },
        { name: 'viewCount', type: 'int32' },
        { name: 'saveCount', type: 'int32' },
        { name: 'isPublic', type: 'bool' },
      ],
    };

    try {
      // Create collections if they don't exist
      await typesense.collections().create(restaurantSchema);
      await typesense.collections().create(userSchema);
      await typesense.collections().create(listSchema);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.error('Error creating Typesense collections:', error);
      }
    }
  }

  async indexRestaurant(restaurant: Restaurant) {
    const document = {
      id: restaurant.id.toString(),
      name: restaurant.name,
      location: restaurant.location || restaurant.city || '',
      category: restaurant.category || '',
      cuisine: restaurant.cuisine || restaurant.category || '',
      priceRange: restaurant.priceRange || '$$',
      tags: this.extractTags(restaurant),
      description: restaurant.description || '',
      geopoint: restaurant.latitude && restaurant.longitude 
        ? [parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)]
        : undefined,
      rating: typeof restaurant.rating === 'number' ? restaurant.rating : 4.0,
      verified: restaurant.verified || false,
      popularity_score: this.calculatePopularityScore(restaurant),
    };

    try {
      await typesense.collections('restaurants').documents().upsert(document);
    } catch (error) {
      console.error('Error indexing restaurant:', error);
    }
  }

  async indexUser(user: User & { follower_count?: number }) {
    const document = {
      id: user.id.toString(),
      name: user.name,
      username: user.username,
      bio: user.bio || '',
      preferredCuisines: user.preferredCuisines || [],
      diningInterests: user.diningInterests || [],
      location: user.preferredLocation || '',
      follower_count: user.follower_count || 0,
    };

    try {
      await typesense.collections('users').documents().upsert(document);
    } catch (error) {
      console.error('Error indexing user:', error);
    }
  }

  async indexList(list: RestaurantList) {
    const document = {
      id: list.id.toString(),
      name: list.name,
      description: list.description || '',
      tags: list.tags || [],
      createdById: list.createdById.toString(),
      type: list.type || 'restaurant',
      primaryLocation: list.primaryLocation || '',
      geopoint: list.locationLat && list.locationLng 
        ? [parseFloat(list.locationLat), parseFloat(list.locationLng)]
        : undefined,
      viewCount: list.viewCount || 0,
      saveCount: list.saveCount || 0,
      isPublic: list.makePublic || false,
    };

    try {
      await typesense.collections('lists').documents().upsert(document);
    } catch (error) {
      console.error('Error indexing list:', error);
    }
  }

  async search(options: SearchOptions): Promise<EnhancedSearchResult[]> {
    const { query, lat, lng, radius = 10000, userId, filters } = options;

    // Expand query with semantic terms
    const expandedQuery = this.expandSemanticQuery(query);

    const searchParams = {
      q: expandedQuery,
      query_by: 'name,location,category,cuisine,tags,description',
      sort_by: this.buildSortBy(lat, lng),
      filter_by: this.buildFilters(filters, lat, lng, radius),
      typo_tokens_threshold: 1,
      num_typos: 2,
      prefix: true,
      per_page: 20,
    };

    try {
      // Search across all collections
      const [restaurantResults, userResults, listResults] = await Promise.all([
        typesense.collections('restaurants').documents().search(searchParams),
        typesense.collections('users').documents().search({
          ...searchParams,
          query_by: 'name,username,bio,preferredCuisines,diningInterests',
        }),
        typesense.collections('lists').documents().search({
          ...searchParams,
          query_by: 'name,description,tags,primaryLocation',
        }),
      ]);

      // Combine and rank results
      const results: EnhancedSearchResult[] = [];

      // Process restaurant results
      restaurantResults.hits?.forEach((hit: any) => {
        results.push({
          id: hit.document.id,
          name: hit.document.name,
          type: 'restaurant',
          relevanceScore: hit.text_match_info?.score || 0,
          location: {
            city: hit.document.location,
            distance: this.calculateDistance(lat, lng, hit.document.geopoint),
          },
          metadata: hit.document,
        });
      });

      // Process user results (if userId provided for personalization)
      if (userId) {
        userResults.hits?.forEach((hit: any) => {
          results.push({
            id: hit.document.id,
            name: hit.document.name,
            type: 'user',
            relevanceScore: hit.text_match_info?.score || 0,
            metadata: hit.document,
          });
        });
      }

      // Process list results
      listResults.hits?.forEach((hit: any) => {
        results.push({
          id: hit.document.id,
          name: hit.document.name,
          type: 'list',
          relevanceScore: hit.text_match_info?.score || 0,
          location: {
            city: hit.document.primaryLocation,
            distance: this.calculateDistance(lat, lng, hit.document.geopoint),
          },
          metadata: hit.document,
        });
      });

      // Enhanced sorting: relevance first, then rating
      return results.sort((a, b) => {
        // Primary sort by relevance score
        if (a.relevanceScore !== b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        
        // Secondary sort by rating for restaurants
        if (a.type === 'restaurant' && b.type === 'restaurant') {
          const aRating = a.metadata?.rating || a.metadata?.avgRating || 0;
          const bRating = b.metadata?.rating || b.metadata?.avgRating || 0;
          return bRating - aRating;
        }
        
        return 0;
      });

    } catch (error) {
      console.error('Typesense search error:', error);
      console.log('Falling back to basic search with userId:', userId);
      // Fallback to basic PostgreSQL search when Typesense fails
      const fallbackResults = await this.basicSearch(query, { lat, lng, radius, userId });
      console.log('Basic search returned:', fallbackResults.length, 'results');
      return fallbackResults;
    }
  }

  private expandSemanticQuery(query: string): string {
    let expandedQuery = query;

    Object.entries(SEMANTIC_MAPPINGS).forEach(([key, synonyms]) => {
      if (query.toLowerCase().includes(key)) {
        expandedQuery += ' ' + synonyms.join(' ');
      }
    });

    return expandedQuery;
  }

  private buildSortBy(lat?: number, lng?: number): string {
    if (lat && lng) {
      return `_geopoint(${lat},${lng}):asc,popularity_score:desc`;
    }
    return 'popularity_score:desc,rating:desc';
  }

  private buildFilters(filters?: SearchOptions['filters'], lat?: number, lng?: number, radius?: number): string {
    const filterParts: string[] = [];

    if (filters?.priceRange?.length) {
      filterParts.push(`priceRange:[${filters.priceRange.map(p => `"${p}"`).join(',')}]`);
    }

    if (filters?.cuisine?.length) {
      filterParts.push(`cuisine:[${filters.cuisine.map(c => `"${c}"`).join(',')}]`);
    }

    if (lat && lng && radius) {
      filterParts.push(`geopoint:(${lat}, ${lng}, ${radius}m)`);
    }

    return filterParts.join(' && ');
  }

  private extractTags(restaurant: Restaurant): string[] {
    const tags: string[] = [];

    if (restaurant.category) tags.push(restaurant.category.toLowerCase());
    if (restaurant.cuisine) tags.push(restaurant.cuisine.toLowerCase());
    if (restaurant.priceRange) tags.push(restaurant.priceRange);

    // Add semantic tags based on category/cuisine
    if (restaurant.category?.toLowerCase().includes('coffee')) {
      tags.push('coffee', 'cafe', 'morning');
    }
    if (restaurant.category?.toLowerCase().includes('bar')) {
      tags.push('drinks', 'evening', 'social');
    }

    return [...new Set(tags)];
  }

  private calculatePopularityScore(restaurant: Restaurant): number {
    let score = 0;

    if (restaurant.verified) score += 100;
    if (restaurant.rating && restaurant.rating > 4) score += 50;
    if (restaurant.googlePlaceId) score += 25;

    return score;
  }

  private async basicSearch(query: string, options: { lat?: number; lng?: number; radius?: number; userId?: number }): Promise<EnhancedSearchResult[]> {
    const { lat, lng, radius, userId } = options;
    const results: EnhancedSearchResult[] = [];

    try {
      const { db } = await import('../db');
      const { restaurants, users, restaurantLists, posts } = await import('../../shared/schema');
      const { eq, or, ilike, sql, desc, and } = await import('drizzle-orm');

      // Enhanced restaurant search with relevance scoring
      const restaurantResults = await db.select({
        id: restaurants.id,
        name: restaurants.name,
        location: restaurants.location,
        category: restaurants.category,
        cuisine: restaurants.cuisine,
        address: restaurants.address,
        priceRange: restaurants.priceRange,
        imageUrl: restaurants.imageUrl,
        city: restaurants.city,
        state: restaurants.state,
        latitude: restaurants.latitude,
        longitude: restaurants.longitude,
        googlePlaceId: restaurants.googlePlaceId,
        avgRating: sql<number>`COALESCE(AVG(${posts.rating}), 4.0)`,
        relevanceScore: sql<number>`
          CASE 
            WHEN LOWER(${restaurants.name}) = LOWER(${query}) THEN 100
            WHEN LOWER(${restaurants.name}) LIKE LOWER(${query + '%'}) THEN 90
            WHEN LOWER(${restaurants.name}) LIKE LOWER(${'%' + query + '%'}) THEN 80
            WHEN LOWER(${restaurants.category}) LIKE LOWER(${'%' + query + '%'}) THEN 70
            WHEN LOWER(${restaurants.cuisine}) LIKE LOWER(${'%' + query + '%'}) THEN 70
            ELSE 60
          END
        `.as('relevanceScore'),
      })
      .from(restaurants)
      .leftJoin(posts, eq(restaurants.id, posts.restaurantId))
      .where(
        or(
          ilike(restaurants.name, `%${query}%`),
          ilike(restaurants.location, `%${query}%`),
          ilike(restaurants.category, `%${query}%`),
          ilike(restaurants.cuisine, `%${query}%`),
          ilike(restaurants.address, `%${query}%`)
        )
      )
      .groupBy(restaurants.id)
      .orderBy(desc(sql`relevanceScore`), desc(sql`AVG(${posts.rating})`))
      .limit(10);

      // Search users (if userId provided)
      if (userId) {
        const userResults = await db.select()
          .from(users)
          .where(
            and(
              or(
                ilike(users.name, `%${query}%`),
                ilike(users.username, `%${query}%`),
                ilike(users.bio, `%${query}%`),
                ilike(users.favoriteFood, `%${query}%`),
                ilike(users.favoriteRestaurant, `%${query}%`)
              ),
              sql`${users.id} != ${userId}`
            )
          )
          .limit(5);

        // Add user results
        userResults.forEach(user => {
          results.push({
            id: user.id.toString(),
            name: user.name,
            type: 'user',
            relevanceScore: 50,
            metadata: user,
          });
        });
      }

      // Search lists  
      const listResults = await db.select()
        .from(restaurantLists)
        .where(
          and(
            or(
              ilike(restaurantLists.name, `%${query}%`),
              ilike(restaurantLists.description, `%${query}%`),
              sql`${restaurantLists.tags}::text ILIKE ${'%' + query + '%'}`
            ),
            eq(restaurantLists.makePublic, true)
          )
        )
        .limit(5);

      // Add restaurant results with enhanced relevance scoring
      restaurantResults.forEach(restaurant => {
        const relevanceScore = restaurant.relevanceScore || this.calculateRelevanceScore(restaurant.name, query);
        results.push({
          id: restaurant.id.toString(),
          name: restaurant.name,
          type: 'restaurant',
          relevanceScore: relevanceScore,
          location: {
            city: restaurant.location,
            address: restaurant.address,
          },
          metadata: restaurant,
        });
      });

      // Add list results
      listResults.forEach(list => {
        results.push({
          id: list.id.toString(),
          name: list.name,
          type: 'list',
          relevanceScore: 40,
          location: {
            city: list.primaryLocation,
          },
          metadata: list,
        });
      });

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('Basic search error:', error);
      return [];
    }
  }

  private calculateDistance(lat1?: number, lng1?: number, geopoint?: [number, number]): number | undefined {
    if (!lat1 || !lng1 || !geopoint) return undefined;

    const [lat2, lng2] = geopoint;
    const R = 6371; // Earth's radius in km

    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c * 1000; // Distance in meters
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateRelevanceScore(restaurantName: string, query: string): number {
    const name = restaurantName.toLowerCase();
    const searchTerm = query.toLowerCase();
    
    // Exact match gets highest score
    if (name === searchTerm) return 100;
    
    // Starts with query gets high score
    if (name.startsWith(searchTerm)) return 90;
    
    // Contains query gets medium score
    if (name.includes(searchTerm)) return 80;
    
    // Partial word matches get lower score
    const nameWords = name.split(/\s+/);
    const queryWords = searchTerm.split(/\s+/);
    
    for (const nameWord of nameWords) {
      for (const queryWord of queryWords) {
        if (nameWord.startsWith(queryWord)) return 70;
      }
    }
    
    return 60; // Default score
  }
}

// Enhanced search engine with semantic search capabilities
export class EnhancedSearchEngine {
  private static instance: EnhancedSearchEngine;

  public static getInstance(): EnhancedSearchEngine {
    if (!EnhancedSearchEngine.instance) {
      EnhancedSearchEngine.instance = new EnhancedSearchEngine();
    }
    return EnhancedSearchEngine.instance;
  }

  async unifiedSearch(
    query: string, 
    userId: number, 
    filters: any = {}, 
    limits: { restaurants: number, lists: number, users: number, posts: number } = { restaurants: 10, lists: 5, users: 5, posts: 5 }
  ) {
    const searchEngineService = SearchEngineService.getInstance();

    // Use the existing search functionality with enhanced capabilities
    const results = await searchEngineService.search({
      query,
      userId,
      filters,
      lat: filters.lat,
      lng: filters.lng,
      radius: filters.radius
    });

    // Group results by type and apply limits
    const restaurants = results.filter(r => r.type === 'restaurant').slice(0, limits.restaurants);
    const lists = results.filter(r => r.type === 'list').slice(0, limits.lists);
    const users = results.filter(r => r.type === 'user').slice(0, limits.users);
    const posts = results.filter(r => r.type === 'post').slice(0, limits.posts);

    return { restaurants, lists, users, posts };
  }

  async searchRestaurants(query: string, userId: number, filters: any = {}, limit: number = 10) {
    const searchEngineService = SearchEngineService.getInstance();
    const results = await searchEngineService.search({
      query,
      userId,
      filters,
      lat: filters.lat,
      lng: filters.lng,
      radius: filters.radius
    });

    return results.filter(r => r.type === 'restaurant').slice(0, limit);
  }

  async searchLists(query: string, userId: number, limit: number = 5) {
    const searchEngineService = SearchEngineService.getInstance();
    const results = await searchEngineService.search({
      query,
      userId
    });

    return results.filter(r => r.type === 'list').slice(0, limit);
  }

  async searchUsers(query: string, userId: number, limit: number = 5) {
    const searchEngineService = SearchEngineService.getInstance();
    const results = await searchEngineService.search({
      query,
      userId
    });

    return results.filter(r => r.type === 'user').slice(0, limit);
  }

  async searchPosts(query: string, userId: number, limit: number = 5) {
    const searchEngineService = SearchEngineService.getInstance();
    const results = await searchEngineService.search({
      query,
      userId
    });

    return results.filter(r => r.type === 'post').slice(0, limit);
  }
}

export const searchEngine = SearchEngineService.getInstance();
export const enhancedSearchEngine = EnhancedSearchEngine.getInstance();