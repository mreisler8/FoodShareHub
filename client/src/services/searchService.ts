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
  // List-specific fields
  description?: string;
  tags?: string[];
  // Restaurant-specific fields
  cuisine?: string;
  priceRange?: string;
  address?: string;
  googlePlaceId?: string;
  source?: 'database' | 'google';
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
   * Unified search across all content types with semantic enhancements
   */
  async searchUnified(query: string, options: SearchOptions = {}): Promise<UnifiedSearchResults> {
    if (query.length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    let searchUrl = `/api/search/unified?q=${encodeURIComponent(query)}`;

    // Add location parameters if available
    if (options.location) {
      searchUrl += `&lat=${options.location.lat}&lng=${options.location.lng}&radius=${options.radius || 10000}`;
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

    return response.json();
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
}