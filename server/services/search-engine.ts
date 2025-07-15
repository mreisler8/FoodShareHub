
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

      // Sort by relevance and return
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      console.error('Typesense search error:', error);
      return [];
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
}

export const searchEngine = SearchEngineService.getInstance();
