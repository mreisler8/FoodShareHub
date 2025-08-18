import { LocationData } from './locationService';

export interface SearchResult {
  id: string;
  name: string;
  subtitle?: string;
  type: 'restaurant' | 'list' | 'post' | 'user';
  avatar?: string;
  location?: string;
  thumbnailUrl?: string;
  avgRating?: number;
  // User-specific fields
  username?: string;
  bio?: string;
  profilePicture?: string;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  mutualsCount?: number;
  // List-specific fields
  description?: string;
  tags?: string[];
  // Restaurant-specific fields
  cuisine?: string;
  priceRange?: string;
  address?: string;
  googlePlaceId?: string;
  source?: 'database' | 'google';
  // Exact match and relevance fields
  isExactMatch?: boolean;
  relevanceScore?: number;
  // Metadata for additional information
  metadata?: {
    category?: string;
    priceRange?: string;
    cuisine?: string;
    address?: string;
    reviewCount?: number;
    googlePlaceId?: string;
    [key: string]: any;
  };
}

export interface UnifiedSearchResults {
  restaurants: SearchResult[];
  lists: SearchResult[];
  posts: SearchResult[];
  users: SearchResult[];
}

export interface SearchOptions {
  location?: LocationData;
  radius?: number;
  limit?: number;
  includeLocation?: boolean;
  sortBy?: 'relevance' | 'rating' | 'circleScore';
}

export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Unified search across all content types with Circle Score integration
   */
  async searchUnified(query: string, options: SearchOptions = {}): Promise<UnifiedSearchResults> {
    if (query.length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    let searchUrl = `/api/search/unified?q=${encodeURIComponent(query)}`;

    // Add location parameters if available with expanded radius for better coverage
    if (options.location) {
      searchUrl += `&lat=${options.location.lat}&lng=${options.location.lng}&radius=${options.radius || 25000}`;
    }

    // Add sorting preference
    if (options.sortBy) {
      searchUrl += `&sortBy=${options.sortBy}`;
    }

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          restaurants: [],
          lists: [],
          posts: [],
          users: []
        };
      }
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status >= 500) {
        throw new Error('Server error - please try again');
      }
      throw new Error('Search failed');
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }

    const data = await response.json();
    
    // API returns data in results object, extract it
    const results = data.results || data;

    // Enhance restaurant results with Circle Score data
    if (results.restaurants && results.restaurants.length > 0) {
      results.restaurants = await this.enhanceRestaurantsWithCircleScore(results.restaurants);
    }

    // Sort by exact match first, then by specified sort option
    if (results.restaurants) {
      results.restaurants.sort((a: SearchResult, b: SearchResult) => {
        // Check for exact matches first
        if (a.isExactMatch && !b.isExactMatch) return -1;
        if (!a.isExactMatch && b.isExactMatch) return 1;

        // Apply sorting based on options
        if (options.sortBy === 'circleScore') {
          // Prioritize restaurants with Circle Scores
          const aHasCircleScore = a.metadata?.circleScore !== undefined;
          const bHasCircleScore = b.metadata?.circleScore !== undefined;
          
          if (aHasCircleScore && !bHasCircleScore) return -1;
          if (!aHasCircleScore && bHasCircleScore) return 1;
          
          if (aHasCircleScore && bHasCircleScore) {
            return (b.metadata?.circleScore || 0) - (a.metadata?.circleScore || 0);
          }
        }

        // Calculate relevance score based on name matching
        const getRelevanceScore = (restaurant: SearchResult, query: string) => {
          const name = restaurant.name.toLowerCase();
          const searchTerm = query.toLowerCase();

          if (name === searchTerm) return 100;
          if (name.startsWith(searchTerm)) return 90;
          if (name.includes(searchTerm)) return 80;
          return 70;
        };

        const aRelevance = a.relevanceScore || getRelevanceScore(a, query);
        const bRelevance = b.relevanceScore || getRelevanceScore(b, query);

        // Sort by relevance first, then by rating/circle score
        if (aRelevance !== bRelevance) {
          return bRelevance - aRelevance;
        }

        if (options.sortBy === 'circleScore') {
          const aScore = a.metadata?.circleScore || 0;
          const bScore = b.metadata?.circleScore || 0;
          return bScore - aScore;
        }

        const aRating = typeof a.avgRating === 'number' ? a.avgRating : 0;
        const bRating = typeof b.avgRating === 'number' ? b.avgRating : 0;
        return bRating - aRating;
      });
    }

    return results;
  }

  /**
   * Search specifically for restaurants with enhanced features
   */
  async searchRestaurants(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (query.length < 2) {
      return [];
    }

    const results = await this.searchUnified(query, options);
    return results.restaurants;
  }

  /**
   * Search specifically for users
   */
  async searchUsers(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (query.length < 2) {
      return [];
    }

    const results = await this.searchUnified(query, options);
    return results.users;
  }

  /**
   * Get trending content with location awareness
   */
  async getTrending(options: SearchOptions = {}): Promise<{ trending: SearchResult[] }> {
    let trendingUrl = '/api/search/trending';

    // Add location parameters if available
    if (options.location) {
      trendingUrl += `?lat=${options.location.lat}&lng=${options.location.lng}&radius=${options.radius || 10000}`;
    }

    const response = await fetch(trendingUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status >= 500) {
        throw new Error('Server error - please try again');
      }
      throw new Error('Failed to fetch trending content');
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }

    return response.json();
  }

  /**
   * Get recent searches for the authenticated user
   */
  async getRecentSearches(): Promise<{ recent: string[]; suggestions: string[] }> {
    const response = await fetch('/api/search/recent-searches', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      return { recent: [], suggestions: [] };
    }

    return response.json();
  }

  /**
   * Record a search query for analytics and recent searches
   */
  async recordSearch(query: string): Promise<void> {
    try {
      await fetch('/api/search/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
    } catch (error) {
      // Silently fail - analytics recording is not critical
      console.warn('Failed to record search:', error);
    }
  }

  /**
   * Enhance restaurant results with Circle Score data
   */
  private async enhanceRestaurantsWithCircleScore(restaurants: SearchResult[]): Promise<SearchResult[]> {
    const enhancedRestaurants = await Promise.all(
      restaurants.map(async (restaurant) => {
        try {
          // Fetch Circle Score for each restaurant
          const response = await fetch(`/api/circle-score/${restaurant.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const circleScoreData = await response.json();
            return {
              ...restaurant,
              metadata: {
                ...restaurant.metadata,
                circleScore: circleScoreData.score,
                circleScoreCount: circleScoreData.count,
                circleScoreDescription: circleScoreData.description
              }
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch Circle Score for restaurant ${restaurant.id}:`, error);
        }
        
        return restaurant;
      })
    );

    return enhancedRestaurants;
  }

  /**
   * Get Circle Score for a specific restaurant
   */
  async getCircleScore(restaurantId: string): Promise<{ score: number; count: number; description: string } | null> {
    try {
      const response = await fetch(`/api/circle-score/${restaurantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Failed to fetch Circle Score for restaurant ${restaurantId}:`, error);
    }
    
    return null;
  }
}