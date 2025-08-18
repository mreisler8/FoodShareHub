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
    [key: string]: any;
  };
}

interface SearchResults {
  restaurants: SearchResult[];
  lists: SearchResult[];
  posts: SearchResult[];
  users: SearchResult[];
}

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

  // Fetch personalized recent searches
  const { data: personalizedSearches } = useQuery({
    queryKey: ['/api/search/recent-searches'],
    queryFn: async () => {
      const response = await fetch('/api/search/recent-searches');
      if (!response.ok) {
        throw new Error('Failed to fetch recent searches');
      }
      return response.json();
    },
    enabled: open,
    staleTime: 300000, // 5 minutes
  });
  const [, setLocation] = useLocation();
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Request location on modal open if enabled
  useEffect(() => {
    if (open && showLocationServices && locationPermission === null) {
      requestLocation();
    }
  }, [open, showLocationServices, locationPermission]);

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

  // Fetch search results
  const { data: searchResults, isLoading, error, refetch } = useQuery<SearchResults>({
    queryKey: ['/api/search/unified', { q: debouncedQuery, location: userLocation, type: searchType }],
    queryFn: async () => {
      let searchUrl: string;
      
      if (searchType === 'unified') {
        searchUrl = `/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`;
      } else if (searchType === 'users') {
        // Use new follow endpoint for users tab with mutuals-first ranking
        searchUrl = `/api/search/follow?q=${encodeURIComponent(debouncedQuery)}`;
      } else {
        searchUrl = `/api/search/${searchType}?q=${encodeURIComponent(debouncedQuery)}`;
      }

      // Add location parameters if available and enabled
      if (showLocationServices && userLocation) {
        searchUrl += `&lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10000`;
      }

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000) // Optimized timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Search service unavailable');
        }
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 Search API Response:', data);

      // Handle both unified and specific search types
      if (searchType === 'unified') {
        // API returns data in results object, extract it
        const results = data.results || data;
        return {
          restaurants: results.restaurants || [],
          lists: results.lists || [],
          posts: results.posts || [],
          users: results.users || []
        };
      } else if (searchType === 'users') {
        // Handle follow endpoint response format
        return {
          restaurants: [],
          lists: [],
          posts: [],
          users: data.results || [] // Follow endpoint returns results in 'results' field
        };
      } else {
        // For other specific types, wrap in unified format
        const results = {
          restaurants: [],
          lists: [],
          posts: [],
          users: []
        };
        results[searchType as keyof SearchResults] = Array.isArray(data) ? data : data[searchType] || [];
        return results;
      }
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
    retry: 2,
  });

  // Fetch trending content when no search query
  const { data: trendingResults } = useQuery({
    queryKey: ['/api/search/trending-tags'],
    queryFn: async () => {
      const response = await fetch('/api/search/trending-tags');
      if (!response.ok) return { trending: [], suggested: [] };
      return response.json();
    },
    enabled: open && !debouncedQuery && activeTab !== 'users',
    staleTime: 300000, // 5 minutes
  });

  // Fetch suggested users when no search query (Users tab only)
  const { data: suggestedUsers } = useQuery<SearchResults>({
    queryKey: ['/api/search/follow/suggested'],
    queryFn: async () => {
      const response = await fetch('/api/search/follow', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`Suggested users failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        restaurants: [],
        lists: [],
        posts: [],
        users: data.results || []
      };
    },
    enabled: open && !debouncedQuery && activeTab === 'users',
    staleTime: 60000, // 1 minute for suggested users
    retry: 2,
  });

  useEffect(() => {
    if (personalizedSearches?.recentSearches) {
      setRecentSearches(personalizedSearches.recentSearches.slice(0, 5));
    }
  }, [personalizedSearches]);

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
        if (result.metadata?.googlePlaceId) {
          setLocation(`/restaurants/google/${result.metadata.googlePlaceId}`);
        } else {
          setLocation(`/restaurants/${result.id}`);
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

  const recordSearch = async (query: string, resultType?: string, resultId?: string) => {
    try {
      await fetch('/api/search/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          category: activeTab,
          resultCount: totalResults,
          clicked: !!resultType,
          clickedResultType: resultType,
          clickedResultId: resultId,
        }),
      });
    } catch (error) {
      console.error('Failed to record search:', error);
    }
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    setActiveTab('restaurants');
  };

  const handleFollowToggle = async (userId: string, isFollowing?: boolean) => {
    try {
      const action = isFollowing ? 'unfollow' : 'follow';
      const method = isFollowing ? 'DELETE' : 'POST';
      
      await fetch(`/api/follow/${userId}`, { method });
      
      // Refresh search results to update follow status
      await refetch();
      
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      alert(error instanceof Error ? error.message : 'Failed to toggle follow');
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'restaurants': return <UtensilsCrossed className="h-4 w-4" />;
      case 'lists': return <FileText className="h-4 w-4" />;
      case 'posts': return <MapPin className="h-4 w-4" />;
      case 'users': return <User className="h-4 w-4" />;
      default: return null;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return <UtensilsCrossed className="h-4 w-4 text-primary" />;
      case 'list': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'post': return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'user': return <User className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  // Combine search results with suggested users for display
  const displayResults = debouncedQuery ? searchResults : (activeTab === 'users' ? suggestedUsers : searchResults);
  const hasResults = displayResults && Object.values(displayResults).some(arr => arr.length > 0);
  const totalResults = displayResults ? Object.values(displayResults).reduce((acc, arr) => acc + arr.length, 0) : 0;

  // Determine which tabs to show based on search type
  const visibleTabs = searchType === 'unified' 
    ? ['restaurants', 'users', 'lists', 'posts']
    : [searchType];

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
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
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
                              <Button variant="outline" size="sm" onClick={() => refetch()}>
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