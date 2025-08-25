import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Clock, TrendingUp, MapPin, User, FileText, UtensilsCrossed, Star, Loader2, Navigation, UserPlus, UserCheck, X, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { LocationService, type LocationData } from '@/services/locationService';
import { SearchResultsList } from './SearchResultsList';
import './UnifiedSearchModal.css';

// Assuming SearchService and related types are defined elsewhere in your project
// import { SearchService, SearchOptions } from '@/services/searchService'; 

// Mock SearchService and SearchOptions for demonstration if they are not provided
interface SearchOptions {
  location: LocationData | null;
  radius: number;
  limit: number;
  includeLocation: boolean;
  sortBy: 'relevance' | 'distance';
}

interface SearchResults {
  restaurants: SearchResult[];
  lists: SearchResult[];
  posts: SearchResult[];
  users: SearchResult[];
}

interface SearchResult {
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
  metadata?: {
    googlePlaceId?: string;
    source?: string; // Added source to metadata for restaurants
    [key: string]: any;
  };
  rating?: number; // Added rating for restaurants
  source?: string; // Added source directly to SearchResult for restaurants
  googlePlaceId?: string; // Added googlePlaceId directly to SearchResult for restaurants
}

class MockSearchService {
  private static instance: MockSearchService;

  private constructor() {}

  public static getInstance(): MockSearchService {
    if (!MockSearchService.instance) {
      MockSearchService.instance = new MockSearchService();
    }
    return MockSearchService.instance;
  }

  async searchUnified(query: string, options: SearchOptions): Promise<SearchResults> {
    console.log(`MockSearchService: Searching unified for "${query}" with options`, options);
    // Simulate API response
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data - mix of restaurant types
    const mockRestaurants: SearchResult[] = [
      { id: 'db_1', name: 'Local Bistro', type: 'restaurant', location: 'Downtown', cuisine: 'French', rating: 4.5, source: 'database', metadata: { source: 'database' } },
      { id: 'google_abc', name: 'Pizza Place', type: 'restaurant', location: 'Uptown', cuisine: 'Italian', rating: 4.0, googlePlaceId: 'google_abc', metadata: { googlePlaceId: 'google_abc', source: 'google_places' } },
      { id: 'db_2', name: 'Sushi Spot', type: 'restaurant', location: 'Midtown', cuisine: 'Japanese', rating: 4.8, source: 'database', metadata: { source: 'database' } },
      { id: 'google_def', name: 'Burger Joint', type: 'restaurant', location: 'Downtown', cuisine: 'American', rating: 4.2, googlePlaceId: 'google_def', metadata: { googlePlaceId: 'google_def', source: 'google_places' } },
    ];

    const mockLists: SearchResult[] = [
      { id: 'list_1', name: 'Top 10 Brunch Spots', type: 'list', description: 'A curated list of the best brunch places.', tags: ['brunch', 'breakfast'], avatar: '/path/to/list_avatar.jpg' },
      { id: 'list_2', name: 'Hidden Gems', type: 'list', description: 'Undiscovered local favorites.', tags: ['local', 'secret'], avatar: '/path/to/list_avatar_2.jpg' },
    ];

    const mockPosts: SearchResult[] = [
      { id: 'post_1', name: 'Review of Local Bistro', type: 'post', location: 'Downtown', avatar: '/path/to/user_avatar.jpg', username: 'foodie_gal', content: 'Amazing food and ambiance!' },
      { id: 'post_2', name: 'My visit to Pizza Place', type: 'post', location: 'Uptown', avatar: '/path/to/user_avatar_2.jpg', username: 'pizza_lover', content: 'Best pizza in town!' },
    ];

    const mockUsers: SearchResult[] = [
      { id: 'user_1', name: 'Alice', type: 'user', username: 'alice_wonder', bio: 'Exploring the city, one bite at a time.', profilePicture: '/path/to/alice.jpg', isFollowing: true },
      { id: 'user_2', name: 'Bob', type: 'user', username: 'bob_adventurer', bio: 'Travel and food enthusiast.', profilePicture: '/path/to/bob.jpg', isFollowing: false },
    ];

    // Basic filtering for mock
    const filteredRestaurants = mockRestaurants.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
    const filteredLists = mockLists.filter(l => l.name.toLowerCase().includes(query.toLowerCase()));
    const filteredPosts = mockPosts.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    const filteredUsers = mockUsers.filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.username?.toLowerCase().includes(query.toLowerCase()));

    return {
      restaurants: filteredRestaurants,
      lists: filteredLists,
      posts: filteredPosts,
      users: filteredUsers,
    };
  }
}
const SearchService = MockSearchService; // Use the mock service

interface OptimizedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
  onSelect?: (result: SearchResult) => void;
  showLocationServices?: boolean;
  placeholder?: string;
  searchType?: 'unified' | 'restaurants' | 'users' | 'lists';
  title?: string;
}

export function OptimizedSearchModal({ 
  open, 
  onOpenChange,
  initialTab = 'restaurants',
  onSelect,
  showLocationServices = true,
  placeholder = "Search restaurants, lists, posts, people…",
  searchType = 'unified',
  title = 'Search'
}: OptimizedSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input element

  // Mock state and functions for search
  const [searchResults, setSearchResults] = useState<SearchResults>({
    restaurants: [],
    lists: [],
    posts: [],
    users: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Location detection with enhanced debugging
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Debounced search query
  const debouncedQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    const requestLocation = async () => {
      console.log('🔍 LOCATION: Starting location detection for search');

      try {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
          console.log('🔍 LOCATION: Geolocation not supported');
          setLocationPermission('denied');
          return;
        }

        // Check permission status
        console.log('🔍 LOCATION: Checking permission status');
        const permission = await LocationService.checkPermission();
        console.log('🔍 LOCATION: Permission status:', permission);
        setLocationPermission(permission);

        if (permission === 'granted') {
          console.log('🔍 LOCATION: Permission granted, fetching location');
          const location = await LocationService.getCurrentLocation();
          console.log('🔍 LOCATION: Location obtained:', {
            lat: location.lat,
            lng: location.lng,
            city: location.city,
            address: location.address
          });
          setUserLocation(location);
        } else if (permission === 'prompt') {
          console.log('🔍 LOCATION: Permission prompt - attempting to get location anyway');
          try {
            const location = await LocationService.getCurrentLocation();
            console.log('🔍 LOCATION: Location obtained after prompt:', location);
            setUserLocation(location);
            setLocationPermission('granted');
          } catch (promptError) {
            console.log('🔍 LOCATION: User denied permission after prompt');
            setLocationPermission('denied');
          }
        }
      } catch (error) {
        console.error('🔍 LOCATION: Location detection failed:', error);
        setLocationPermission('denied');
      }
    };

    if (showLocationServices) {
      requestLocation();
    }
  }, [showLocationServices]);

  // Request location IMMEDIATELY on modal open for feed search
  useEffect(() => {
    if (open && showLocationServices) {
      if (locationPermission === null || locationPermission === 'prompt') {
        requestLocation();
      }
    }
  }, [open, showLocationServices]);

  // Auto-request location for unified search
  useEffect(() => {
    if (open && searchType === 'unified' && !userLocation && locationPermission !== 'denied') {
      requestLocation();
    }
  }, [open, searchType, userLocation, locationPermission]);

  const requestLocation = async () => {
    if (!showLocationServices) return;

    try {
      setLocationPermission('prompt');

      // Use the LocationService instance with better error handling
      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();

      if (location && location.lat && location.lng) {
        setUserLocation(location);
        setLocationPermission('granted');
        console.log('Location obtained:', location);
      } else {
        throw new Error('Invalid location data received');
      }
    } catch (error) {
      console.error('Location access denied:', error);
      setLocationPermission('denied');
      // Continue without location - this shouldn't break search
    }
  };

  // Fetch personalized recent searches using useQuery
  const { data: personalizedSearches } = useQuery({
    queryKey: ['/api/search/recent-searches'],
    queryFn: async () => {
      // Simulate fetching recent searches
      await new Promise(resolve => setTimeout(resolve, 200));
      return { recentSearches: ['Italian', 'Mexican', 'Cafes'] };
    },
    enabled: open,
    staleTime: 300000, // 5 minutes
  });

  // Fetch trending content when no search query
  const { data: trendingResults } = useQuery({
    queryKey: ['/api/search/trending-tags'],
    queryFn: async () => {
      // Simulate fetching trending tags
      await new Promise(resolve => setTimeout(resolve, 200));
      return { trending: ['#foodie', '#vegan', '#seafood'], suggested: [] };
    },
    enabled: open && !debouncedQuery && activeTab !== 'users',
    staleTime: 300000, // 5 minutes
  });

  // Fetch suggested users when no search query (Users tab only)
  const { data: suggestedUsers } = useQuery<SearchResults>({
    queryKey: ['/api/search/follow/suggested'],
    queryFn: async () => {
      // Simulate fetching suggested users
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        restaurants: [],
        lists: [],
        posts: [],
        users: [
          { id: 'user_3', name: 'Charlie', type: 'user', username: 'charlie_explorer', bio: 'Loves trying new restaurants.', profilePicture: '/path/to/charlie.jpg', isFollowing: false },
          { id: 'user_4', name: 'Diana', type: 'user', username: 'diana_eats', bio: 'Food blogger and reviewer.', profilePicture: '/path/to/diana.jpg', isFollowing: true },
        ]
      };
    },
    enabled: open && !debouncedQuery && activeTab === 'users',
    staleTime: 60000, // 1 minute for suggested users
    retry: 2,
  });

  // Effect to update recent searches state
  useEffect(() => {
    if (personalizedSearches?.recentSearches) {
      setRecentSearches(personalizedSearches.recentSearches.slice(0, 5));
    }
  }, [personalizedSearches]);

  // Handler for clicking on a search result
  const handleResultClick = (result: SearchResult) => {
    if (onSelect) {
      onSelect(result);
      onOpenChange(false);
      return;
    }

    // Record search analytics
    recordSearch(searchQuery, result.type, result.id);

    // Default navigation behavior
    switch (result.type) {
      case 'restaurant':
        // Handle both database and Google Places results
        if (result.metadata?.googlePlaceId) {
          console.log('🔗 Navigating to Google Places restaurant:', result.metadata.googlePlaceId);
          setLocation(`/restaurants?googlePlaceId=${encodeURIComponent(result.metadata.googlePlaceId)}`);
        } else if (result.googlePlaceId) { // Check direct googlePlaceId as well
          console.log('🔗 Navigating to Google Places restaurant (from ID):', result.googlePlaceId);
          setLocation(`/restaurants?googlePlaceId=${encodeURIComponent(result.googlePlaceId)}`);
        }
        else {
          console.log('🔗 Navigating to database restaurant:', result.id);
          setLocation(`/restaurants/${encodeURIComponent(result.id)}`);
        }
        break;
      case 'user':
        setLocation(`/profile/${result.id}`);
        break;
      case 'list':
        setLocation(`/lists/${result.id}`);
        break;
      case 'post':
        setLocation(`/posts/${result.id}`);
        break;
    }
    onOpenChange(false);
  };

  // Handler to record search analytics
  const recordSearch = async (query: string, resultType?: string, resultId?: string) => {
    try {
      // Simulate API call to track search
      console.log('Recording search:', { query, category: activeTab, resultType, resultId });
    } catch (error) {
      console.error('Failed to record search:', error);
    }
  };

  // Handler for clicking a recent search query
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    // Optionally switch to a specific tab if needed, e.g., setActiveTab('restaurants');
  };

  // Handler to toggle follow status for a user
  const handleFollowToggle = async (userId: string, isFollowing?: boolean) => {
    try {
      // Simulate API call to toggle follow status
      console.log(`Toggling follow for user ${userId}. Current status: ${isFollowing}`);
      // In a real app: await fetch(`/api/follow/${userId}`, { method: isFollowing ? 'DELETE' : 'POST' });
      
      // Refresh search results to update follow status if they are currently displayed
      // await refetch(); // This would require using the useQuery hook for search results

      // Invalidate user-related queries to ensure fresh data elsewhere
      queryClient.invalidateQueries({ queryKey: ['/api/users'] }); // Assuming this query key exists
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      alert(error instanceof Error ? error.message : 'Failed to toggle follow');
    }
  };

  // Helper function to get tab icons
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'restaurants': return <UtensilsCrossed className="h-4 w-4" />;
      case 'lists': return <FileText className="h-4 w-4" />;
      case 'posts': return <MapPin className="h-4 w-4" />; // Assuming MapPin for posts
      case 'users': return <User className="h-4 w-4" />;
      default: return null;
    }
  };

  // Helper function to get result item icons
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return <UtensilsCrossed className="h-4 w-4 text-primary" />;
      case 'list': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'post': return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'user': return <User className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  // Effect to handle search execution when debounced query changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      // Clear results if query is too short or empty
      setSearchResults({ restaurants: [], lists: [], posts: [], users: [] });
    }
  }, [debouncedQuery, performSearch]);


  // Combine search results with suggested users for display when query is empty
  const displayResults = debouncedQuery ? searchResults : (activeTab === 'users' ? suggestedUsers : searchResults);
  const totalResults = displayResults ? Object.values(displayResults).reduce((acc, arr) => acc + arr.length, 0) : 0;

  // Determine which tabs to show based on search type prop
  const visibleTabs = searchType === 'unified' 
    ? ['restaurants', 'users', 'lists', 'posts']
    : (searchType ? [searchType] : ['restaurants']); // Default to restaurants if searchType is not provided but is not unified

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] p-0" 
        aria-describedby="search-description"
      >
        <div className="sr-only">
          <h2 id="search-title">{title}</h2>
          <p id="search-description">Search for restaurants, lists, posts, and people</p>
        </div>
        {/* Search Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
              autoFocus // Auto-focus the input when the modal opens
            />
          </div>

          {/* Location Status */}
          {showLocationServices && (
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {locationPermission === 'granted' && userLocation && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Navigation className="h-3 w-3" />
                    <span>
                      Searching near {userLocation.city && userLocation.city !== `${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}` 
                        ? userLocation.city 
                        : 'your location'}
                    </span>
                  </div>
                )}
                {locationPermission === 'denied' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>Location access denied</span>
                  </div>
                )}
                {locationPermission === 'prompt' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Getting location...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search Content */}
        <div className="flex-1 overflow-hidden">
          {!debouncedQuery ? (
            /* Empty State - Recent Searches & Trending */
            <div className="p-6 space-y-6">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">Recent Searches</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecentSearchClick(query)}
                        className="h-8 px-3 text-sm"
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {trendingResults && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">Trending</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingResults.trending?.slice(0, 8).map((tag: any, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery(typeof tag === 'string' ? tag : tag.name)}
                        className="h-8 px-3 text-sm"
                      >
                        {typeof tag === 'string' ? tag : tag.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Search Results */
            <div className="h-full">
              {visibleTabs.length === 1 ? (
                // Single tab view
                <div className="p-4 h-full overflow-y-auto">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-600 mb-2">Search failed</p>
                        <Button variant="outline" size="sm" onClick={() => performSearch(debouncedQuery)}>
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <SearchResultsList
                      results={searchResults?.[searchType as keyof SearchResults] || []}
                      isLoading={isLoading}
                      onResultClick={handleResultClick}
                      onFollowToggle={handleFollowToggle}
                      showFollowButton={searchType === 'users'}
                      enableDirectNavigation={!onSelect}
                    />
                  )}
                </div>
              ) : (
                // Multi-tab view
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                  <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
                    {visibleTabs.map((tab) => (
                      <TabsTrigger key={tab} value={tab} className="flex items-center gap-1.5">
                        {getTabIcon(tab)}
                        <span className="capitalize">{tab}</span>
                        {searchResults && searchResults[tab as keyof SearchResults]?.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                            {searchResults[tab as keyof SearchResults].length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {visibleTabs.map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-4 h-full">
                      <div className="px-4 pb-4 h-full overflow-y-auto">
                        {isLoading ? (
                          <div className="flex flex-col items-center justify-center h-40">
                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                            <span className="text-sm text-muted-foreground">Searching...</span>
                          </div>
                        ) : error ? (
                          <div className="flex flex-col items-center justify-center h-40">
                            <div className="text-center">
                              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                              <p className="text-sm text-red-600 mb-2">Search failed</p>
                              <Button variant="outline" size="sm" onClick={() => performSearch(debouncedQuery)}>
                                Try Again
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <SearchResultsList
                            results={displayResults?.[tab as keyof SearchResults] || []}
                            isLoading={isLoading}
                            onResultClick={handleResultClick}
                            onFollowToggle={handleFollowToggle}
                            showFollowButton={tab === 'users'}
                            enableDirectNavigation={!onSelect}
                          />
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}