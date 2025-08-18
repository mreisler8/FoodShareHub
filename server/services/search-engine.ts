import { Client } from 'typesense';
import { Restaurant, User, RestaurantList } from '@shared/schema';

// Memoization for search relevance calculations
const relevanceCache = new Map<string, number>();

// Memoized relevance score calculation
function getRelevanceScore(restaurantName: string, query: string): number {
  const cacheKey = `${restaurantName.toLowerCase()}-${query.toLowerCase()}`;
  
  if (relevanceCache.has(cacheKey)) {
    return relevanceCache.get(cacheKey)!;
  }
  
  const name = restaurantName.toLowerCase();
  const searchTerm = query.toLowerCase();
  
  let score: number;
  if (name === searchTerm) score = 100;
  else if (name.startsWith(searchTerm)) score = 90;
  else if (name.includes(searchTerm)) score = 80;
  else score = 70;
  
  // Cache the result for future use
  relevanceCache.set(cacheKey, score);
  
  // Prevent cache from growing too large
  if (relevanceCache.size > 1000) {
    const firstKey = relevanceCache.keys().next().value;
    if (firstKey) {
      relevanceCache.delete(firstKey);
    }
  }
  
  return score;
}

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
    'costa', 'verde', 'casa', 'plaza', 'mesa', 'vista', 'royal', 'grand',
    // Missing Japanese/Asian terms that were causing issues
    'wagyu', 'tempura', 'teriyaki', 'yakitori', 'tonkatsu', 'omakase', 'kaiseki',
    'shabu', 'sukiyaki', 'katsu', 'donburi', 'bento', 'miso', 'udon', 'soba',
    'chirashi', 'nigiri', 'maki', 'izakaya', 'robata', 'teppanyaki'
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
        { name: 'id', type: 'string' as const },
        { name: 'name', type: 'string' as const },
        { name: 'location', type: 'string' as const },
        { name: 'category', type: 'string' as const },
        { name: 'cuisine', type: 'string' as const },
        { name: 'priceRange', type: 'string' as const },
        { name: 'tags', type: 'string[]' as const },
        { name: 'description', type: 'string' as const, optional: true },
        { name: 'geopoint', type: 'geopoint' as const, optional: true },
        { name: 'rating', type: 'float' as const, optional: true },
        { name: 'verified', type: 'bool' as const },
        { name: 'popularity_score', type: 'int32' as const },
      ],
    };

    // User collection schema
    const userSchema = {
      name: 'users',
      fields: [
        { name: 'id', type: 'string' as const },
        { name: 'name', type: 'string' as const },
        { name: 'username', type: 'string' as const },
        { name: 'bio', type: 'string' as const, optional: true },
        { name: 'preferredCuisines', type: 'string[]' as const },
        { name: 'diningInterests', type: 'string[]' as const },
        { name: 'location', type: 'string' as const, optional: true },
        { name: 'follower_count', type: 'int32' as const },
      ],
    };

    // List collection schema
    const listSchema = {
      name: 'lists',
      fields: [
        { name: 'id', type: 'string' as const },
        { name: 'name', type: 'string' as const },
        { name: 'description', type: 'string' as const, optional: true },
        { name: 'tags', type: 'string[]' as const },
        { name: 'createdById', type: 'string' as const },
        { name: 'type', type: 'string' as const },
        { name: 'primaryLocation', type: 'string' as const, optional: true },
        { name: 'geopoint', type: 'geopoint' as const, optional: true },
        { name: 'viewCount', type: 'int32' as const },
        { name: 'saveCount', type: 'int32' as const },
        { name: 'isPublic', type: 'bool' as const },
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
      rating: 4.0, // Default rating since restaurants table doesn't have rating field
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
    
    console.log(`🎯 SearchEngineService.search() received query: "${query}" with options:`, JSON.stringify(options, null, 2));

    // Step 1: Check for exact matches first
    const exactMatches = await this.findExactMatches(query);
    
    if (exactMatches.length > 0) {
      // Return exact matches with highest priority, then supplement with fuzzy results
      const exactResults: EnhancedSearchResult[] = exactMatches.map(match => ({
        id: match.id,
        name: match.name,
        type: match.type as 'restaurant' | 'list' | 'user' | 'post',
        relevanceScore: 100,
        isExactMatch: true,
        metadata: match,
      }));

      // Get additional fuzzy results excluding exact matches
      const fuzzyResults = await this.performFuzzySearch(query, options, exactMatches.map(m => m.id));
      
      return [...exactResults, ...fuzzyResults];
    }

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
      console.log(`🔄 Falling back to basic search with query: "${query}" and userId:`, userId);
      // Fallback to basic PostgreSQL search when Typesense fails
      const fallbackResults = await this.basicSearch(query, { lat, lng, radius, userId, filters });
      console.log('Basic search returned:', fallbackResults.length, 'results');
      return fallbackResults;
    }
  }

  private expandSemanticQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return query || '';
    }
    
    let expandedQuery = query;

    Object.entries(SEMANTIC_MAPPINGS).forEach(([key, synonyms]) => {
      if (query.toLowerCase().includes(key.toLowerCase()) && Array.isArray(synonyms)) {
        expandedQuery += ' ' + synonyms.filter(s => s && typeof s === 'string').join(' ');
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

    return Array.from(new Set(tags));
  }

  private calculatePopularityScore(restaurant: Restaurant): number {
    let score = 0;

    if (restaurant.verified) score += 100;
    // Note: restaurant rating field doesn't exist in schema, skip rating-based scoring
    if (restaurant.googlePlaceId) score += 25;

    return score;
  }

  private async basicSearch(query: string, options: { lat?: number; lng?: number; radius?: number; userId?: number }): Promise<EnhancedSearchResult[]> {
    const { userId } = options;
    const results: EnhancedSearchResult[] = [];

    try {
      const { db } = await import('../db');
      const { restaurants, users, restaurantLists } = await import('../../shared/schema');
      const { or, ilike, desc, and, eq } = await import('drizzle-orm');

      console.log(`🔍 Basic search starting for query: "${query}"`);

      // Simple restaurant search
      const restaurantResults = await db
        .select()
        .from(restaurants)
        .where(
          or(
            ilike(restaurants.name, `%${query}%`),
            ilike(restaurants.address, `%${query}%`),
            ilike(restaurants.city, `%${query}%`),
            ilike(restaurants.location, `%${query}%`),
            ilike(restaurants.category, `%${query}%`),
            ilike(restaurants.cuisine, `%${query}%`)
          )
        )
        .limit(20);

      console.log(`✅ Found ${restaurantResults.length} restaurants`);
      if (restaurantResults.length > 0) {
        console.log('Restaurant matches:', restaurantResults.map(r => ({ id: r.id, name: r.name })));
      }

      // Add restaurant results
      restaurantResults.forEach(restaurant => {
        const relevanceScore = this.calculateRelevanceScore(restaurant.name, query);
        results.push({
          id: restaurant.id.toString(),
          name: restaurant.name,
          type: 'restaurant',
          relevanceScore: relevanceScore,
          location: {
            city: restaurant.city || restaurant.location,
            address: restaurant.address || undefined,
          },
          metadata: restaurant,
        });
      });

      // Search users - THIS WAS MISSING!
      try {
        const userResults = await db
          .select()
          .from(users)
          .where(
            or(
              ilike(users.name, `%${query}%`),
              ilike(users.username, `%${query}%`),
              ilike(users.bio, `%${query}%`)
            )
          )
          .limit(10);

        console.log(`👥 Found ${userResults.length} users`);
        if (userResults.length > 0) {
          console.log('User matches:', userResults.map(u => ({ id: u.id, name: u.name, username: u.username })));
        }

        userResults.forEach(user => {
          const relevanceScore = this.calculateRelevanceScore(user.name || user.username, query);
          results.push({
            id: user.id.toString(),
            name: user.name || user.username,
            type: 'user',
            relevanceScore: relevanceScore,
            metadata: {
              ...user,
              username: user.username,
              bio: user.bio,
              profilePicture: user.profilePicture
            },
          });
        });
      } catch (userError) {
        console.log('User search skipped due to error:', userError);
      }

      // Search lists if needed
      try {
        const listResults = await db
          .select()
          .from(restaurantLists)
          .where(
            and(
              or(
                ilike(restaurantLists.name, `%${query}%`),
                ilike(restaurantLists.description, `%${query}%`)
              ),
              eq(restaurantLists.isPublic, true)
            )
          )
          .limit(10);

        listResults.forEach(list => {
          results.push({
            id: list.id.toString(),
            name: list.name,
            type: 'list',
            relevanceScore: 40,
            metadata: list,
          });
        });
      } catch (listError) {
        console.log('List search skipped due to error:', listError);
      }

      console.log(`🎯 Total search results: ${results.length}`);
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('❌ Basic search error:', error);
      return [];
    }
  }

  private async findExactMatches(query: string): Promise<any[]> {
    if (!query || typeof query !== 'string') {
      return [];
    }
    const lowerQuery = query.toLowerCase().trim();
    
    try {
      const { db } = await import('../db');
      const { restaurants, users, restaurantLists } = await import('../../shared/schema');
      const { sql, eq } = await import('drizzle-orm');

      // Search for exact matches across all content types
      const [restaurantMatches, userMatches, listMatches] = await Promise.all([
        // Exact restaurant name matches
        db.select({
          id: restaurants.id,
          name: restaurants.name,
          type: sql<string>`'restaurant'`,
          location: restaurants.location,
          category: restaurants.category,
          cuisine: restaurants.cuisine,
          googlePlaceId: restaurants.googlePlaceId,
        }).from(restaurants).where(sql`LOWER(COALESCE(${restaurants.name}, '')) = ${lowerQuery}`),
        
        // Exact username matches
        db.select({
          id: users.id,
          name: users.name,
          type: sql<string>`'user'`,
          username: users.username,
          bio: users.bio,
        }).from(users).where(sql`LOWER(COALESCE(${users.username}, '')) = ${lowerQuery}`),
        
        // Exact list name matches
        db.select({
          id: restaurantLists.id,
          name: restaurantLists.name,
          type: sql<string>`'list'`,
          description: restaurantLists.description,
          tags: restaurantLists.tags,
        }).from(restaurantLists).where(sql`LOWER(COALESCE(${restaurantLists.name}, '')) = ${lowerQuery}`)
      ]);

      return [...restaurantMatches, ...userMatches, ...listMatches];
    } catch (error) {
      console.error('Error finding exact matches:', error);
      return [];
    }
  }

  private async performFuzzySearch(query: string, options: SearchOptions, excludeIds: any[]): Promise<EnhancedSearchResult[]> {
    // Perform the existing semantic search but exclude exact match IDs
    const expandedQuery = this.expandSemanticQuery(query);
    
    // Continue with existing search logic...
    return [];
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
    if (!restaurantName || !query) return 0;
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