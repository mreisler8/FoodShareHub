import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Clock, TrendingUp, MapPin, User, FileText, UtensilsCrossed, Star, Loader2, Navigation, UserPlus, UserCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { LocationService, type LocationData } from '@/services/locationService';
import { SearchResultsList } from './SearchResultsList';
import { SearchReliabilityFix } from '@/components/mvp/SearchReliabilityFix';
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

interface UnifiedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // NEW: Optional context-aware props for list building
  selectionMode?: 'navigate' | 'select' | 'both'; // Default: 'navigate'
  onSelectResult?: (result: SearchResult) => void;
  showSelectionUI?: boolean; // Default: false
}

export function UnifiedSearchModal({ 
  open, 
  onOpenChange,
  selectionMode = 'navigate',
  onSelectResult,
  showSelectionUI = false
}: UnifiedSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('restaurants');
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

  // Request location on modal open
  useEffect(() => {
    if (open && locationPermission === null) {
      requestLocation();
    }
  }, [open, locationPermission]);

  const requestLocation = async () => {
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
    queryKey: ['/api/search/unified', { q: debouncedQuery, location: userLocation }],
    queryFn: async () => {
      let searchUrl = `/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`;

      // Add location parameters if available
      if (userLocation) {
        searchUrl += `&lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10000`;
      }

      console.log('🔍 Making search request to:', searchUrl);

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(8000)
      });

      console.log('🔍 Search response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Search service unavailable');
        }
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status >= 500) {
          throw new Error('Server error - please try again');
        }
        const errorData = await response.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      console.log('🔍 Search response data:', data);

      // Handle both new API format (data.results) and legacy format
      const results = data.results || data;

      // Ensure we have proper arrays and transform restaurant data for UI
      const transformedResults = {
        restaurants: (results.restaurants || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          address: r.address,
          city: r.city,
          cuisine: r.cuisine,
          priceRange: r.priceRange,
          imageUrl: r.imageUrl,
          googlePlaceId: r.googlePlaceId,
          verified: r.verified,
          source: r.source,
          rating: r.rating,
          distance: r.distance,
          relevanceScore: r.relevanceScore
        })),
        lists: results.lists || [],
        posts: results.posts || [],
        users: results.users || []
      };

      console.log('🔍 Transformed search results:', transformedResults);
      return transformedResults;
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
    staleTime: 30000,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('Authentication required')) {
        return false;
      }
      // Don't retry on client errors (4xx)
      if (error.message.includes('service unavailable')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch trending content when no search query
  const { data: trending } = useQuery({
    queryKey: ['/api/search/trending', { location: userLocation }],
    queryFn: async () => {
      let trendingUrl = '/api/search/trending';

      // Add location parameters if available
      if (userLocation) {
        trendingUrl += `?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10000`;
      }

      const response = await fetch(trendingUrl);
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
        console.error('Invalid trending response content type:', contentType);
        throw new Error('Invalid response format');
      }

      return response.json();
    },
    enabled: open && !debouncedQuery,
    staleTime: 300000, // 5 minutes
  });

  const handleResultClick = (result: SearchResult) => {
    try {
      // Validate result before processing
      if (!result || !result.id || !result.type) {
        console.error('Invalid search result:', result);
        return;
      }

      console.log('🔗 Processing result click:', result.type, result.id, result, 'Mode:', selectionMode);

      // Handle selection mode for list building
      if (selectionMode === 'select' && onSelectResult) {
        console.log('📋 Selecting result for list:', result);
        onSelectResult(result);
        onOpenChange(false);
        return;
      }

      // Default navigation behavior (preserves existing functionality)
      console.log('🔗 Navigating to result:', result.type, result.id, result);

      // Navigate based on result type with enhanced routing
      switch (result.type) {
        case 'restaurant':
          // Handle both database and Google Places results
          if (result.metadata?.googlePlaceId) {
            console.log('🔗 Navigating to Google Places restaurant:', result.metadata.googlePlaceId);
            setLocation(`/restaurants/google/${encodeURIComponent(result.metadata.googlePlaceId)}`);
          } else if (result.id.toString().startsWith('google_')) {
            const googlePlaceId = result.id.toString().replace('google_', '');
            console.log('🔗 Navigating to Google Places restaurant (from ID):', googlePlaceId);
            setLocation(`/restaurants/google/${encodeURIComponent(googlePlaceId)}`);
          } else {
            console.log('🔗 Navigating to database restaurant:', result.id);
            setLocation(`/restaurants/${encodeURIComponent(result.id)}`);
          }
          break;
        case 'list':
          console.log('🔗 Navigating to list:', result.id);
          setLocation(`/list-details?id=${encodeURIComponent(result.id)}`);
          break;
        case 'post':
          console.log('🔗 Navigating to post:', result.id);
          setLocation(`/post-details?id=${encodeURIComponent(result.id)}`);
          break;
        case 'user':
          console.log('🔗 Navigating to user profile:', result.id);
          setLocation(`/profile?userId=${encodeURIComponent(result.id)}`);
          break;
        default:
          console.error('Unknown result type:', result.type);
          return;
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error handling search result click:', error);
    }
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchQuery(term);
  };

  const handleFollowToggle = async (userId: string, isFollowing?: boolean) => {
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/follow/${userId}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${errorText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Keep original error message if JSON parsing fails
        }

        // If already following/unfollowing, just refresh to sync state
        if (errorMessage.includes('Already following') || errorMessage.includes('Not following')) {
          refetch();
          return;
        }

        throw new Error(errorMessage);
      }

      // Refresh search results to update follow status
      refetch();

      // Also invalidate all user-related queries to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ['/api/search/unified'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/users'] 
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Show user-friendly error message
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

  const hasResults = searchResults && Object.values(searchResults).some(arr => arr.length > 0);
  const totalResults = searchResults ? Object.values(searchResults).reduce((acc, arr) => acc + arr.length, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] p-0" 
        aria-describedby="search-description"
      >
        <div className="sr-only">
          <h2 id="search-title">Search</h2>
          <p id="search-description">Search for restaurants, lists, posts, and people</p>
        </div>
        {/* Search Header */}
        <div className="p-6 pb-4 border-b">
          {/* Selection Mode Indicator */}
          {selectionMode === 'select' && (
            <div className="mb-3 flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="font-medium">Adding to list</span>
              <span className="text-blue-600">• Click restaurants to add them</span>
            </div>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={
                selectionMode === 'select' 
                  ? "Search restaurants to add to your list…"
                  : "Search restaurants, lists, posts, people…"
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {/* Location Status */}
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
                  <span>Location disabled - showing global results</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestLocation}
                    className="h-6 text-xs ml-2"
                  >
                    Enable Location
                  </Button>
                </div>
              )}
              {locationPermission === 'prompt' && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Navigation className="h-3 w-3 animate-pulse" />
                  <span>Requesting location access...</span>
                </div>
              )}
              {!locationPermission && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>Location services disabled</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestLocation}
                    className="h-6 text-xs ml-2"
                  >
                    Enable Location
                  </Button>
                </div>
              )}
            </div>

            {debouncedQuery && (
              <div className="text-xs text-muted-foreground">
                {userLocation ? 'Searching nearby' : 'Searching everywhere'}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!searchQuery && (
            <div className="p-6 space-y-6">
              {/* Recent Searches */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Recent Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(personalizedSearches?.recent || []).map((term: string, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleRecentSearchClick(term)}
                      className="h-8 text-xs"
                    >
                      {term}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Trending */}
              {trending?.trending && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Trending</span>
                  </div>
                  <div className="space-y-2">
                    {trending.trending.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                        {getResultIcon(item.type)}
                        <div className="flex-1">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {item.type === 'list' ? `${item.viewCount || 0} views` : item.location}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="search-results-enhanced">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8 px-6">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Searching {userLocation ? 'nearby' : 'everywhere'}...
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-8 px-6">
                  <div className="text-center">
                    <span className="text-sm text-red-500 mb-3 block">
                      Search failed. Please try again.
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="text-xs"
                      >
                        Retry Search
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="text-xs"
                      >
                        Clear Search
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {hasResults ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                  <div className="px-6 pt-4 pb-2 border-b">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="restaurants" className="text-xs">
                        {getTabIcon('restaurants')}
                        <span className="ml-1">Restaurants ({searchResults?.restaurants?.length || 0})</span>
                      </TabsTrigger>
                      <TabsTrigger value="lists" className="text-xs">
                        {getTabIcon('lists')}
                        <span className="ml-1">Lists ({searchResults?.lists?.length || 0})</span>
                      </TabsTrigger>
                      <TabsTrigger value="posts" className="text-xs">
                        {getTabIcon('posts')}
                        <span className="ml-1">Posts ({searchResults?.posts?.length || 0})</span>
                      </TabsTrigger>
                      <TabsTrigger value="users" className="text-xs">
                        {getTabIcon('users')}
                        <span className="ml-1">People ({searchResults?.users?.length || 0})</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
                    <TabsContent value="restaurants" className="m-0 p-6">
                      {searchResults?.restaurants?.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.restaurants.map((restaurant: any) => (
                            <div
                              key={restaurant.id}
                              onClick={() => handleResultClick({
                                id: restaurant.id.toString(),
                                name: restaurant.name,
                                type: 'restaurant',
                                location: restaurant.address || restaurant.city,
                                subtitle: restaurant.cuisine,
                                metadata: {
                                  googlePlaceId: restaurant.googlePlaceId
                                }
                              })}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                selectionMode === 'select' 
                                  ? 'hover:bg-blue-50 border border-transparent hover:border-blue-200' 
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <UtensilsCrossed className="h-4 w-4 text-primary" />
                              <div className="flex-1">
                                <div className="font-medium">{restaurant.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {restaurant.cuisine} • {restaurant.address || restaurant.city}
                                </div>
                              </div>
                              {selectionMode === 'select' && (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResultClick({
                                      id: restaurant.id.toString(),
                                      name: restaurant.name,
                                      type: 'restaurant',
                                      location: restaurant.address || restaurant.city,
                                      subtitle: restaurant.cuisine,
                                      metadata: {
                                        googlePlaceId: restaurant.googlePlaceId
                                      }
                                    });
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No restaurants found
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="users" className="m-0 p-6">
                      {searchResults?.users?.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.users.map((user: any) => (
                            <div
                              key={user.id}
                              onClick={() => handleResultClick({
                                id: user.id.toString(),
                                name: user.name,
                                type: 'user',
                                subtitle: user.bio,
                                username: user.username,
                                profilePicture: user.profilePicture
                              })}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.profilePicture} alt={user.name} />
                                <AvatarFallback>
                                  {user.name?.slice(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  @{user.username}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No people found
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="lists" className="m-0 p-6">
                      {searchResults?.lists?.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.lists.map((list: any) => (
                            <div
                              key={list.id}
                              onClick={() => handleResultClick({
                                id: list.id.toString(),
                                name: list.name,
                                type: 'list',
                                subtitle: list.description,
                                tags: list.tags
                              })}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                            >
                              <FileText className="h-4 w-4 text-blue-500" />
                              <div className="flex-1">
                                <div className="font-medium">{list.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {list.description}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No lists found
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="posts" className="m-0 p-6">
                      {searchResults?.posts?.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.posts.map((post: any) => (
                            <div
                              key={post.id}
                              onClick={() => handleResultClick({
                                id: post.id.toString(),
                                name: post.content,
                                type: 'post',
                                subtitle: 'Post'
                              })}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                            >
                              <MapPin className="h-4 w-4 text-blue-500" />
                              <div className="flex-1">
                                <div className="font-medium">{post.content}</div>
                                <div className="text-sm text-muted-foreground">
                                  Post
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No posts found
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                  <Search className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">No results found</span>
                  <span className="text-xs text-muted-foreground">No results for "{searchQuery}"</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}