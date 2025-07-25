
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Clock, TrendingUp, MapPin, User, FileText, UtensilsCrossed, Star, Loader2, Navigation } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { locationService, type LocationData } from '@/services/locationService';
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
}

export function UnifiedSearchModal({ open, onOpenChange }: UnifiedSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('restaurants');
  const [recentSearches] = useState(['Pizza', 'Sushi', 'Best coffee', 'Date night', 'Brunch spots']);
  const [, setLocation] = useLocation();
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Request location on modal open
  useEffect(() => {
    if (open && locationPermission === 'prompt') {
      requestLocation();
    }
  }, [open]);

  const requestLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
      setLocationPermission('granted');
      console.log('Location obtained:', location);
    } catch (error) {
      console.error('Location access denied:', error);
      setLocationPermission('denied');
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
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(errorData.error || 'Search failed');
      }
      const data = await response.json();
      
      // Ensure avgRating is always a valid number
      const processResults = (results: SearchResult[]) => {
        return results.map(result => ({
          ...result,
          avgRating: typeof result.avgRating === 'number' && !isNaN(result.avgRating) ? result.avgRating : 4.0
        }));
      };
      
      return {
        restaurants: processResults(data.restaurants || []),
        lists: data.lists || [],
        posts: data.posts || [],
        users: data.users || []
      };
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
    staleTime: 30000,
    retry: 3,
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
        throw new Error('Failed to fetch trending content');
      }
      return response.json();
    },
    enabled: open && !debouncedQuery,
    staleTime: 300000, // 5 minutes
  });

  const handleResultClick = (result: SearchResult) => {
    // Navigate based on result type
    switch (result.type) {
      case 'restaurant':
        // Handle both database and Google Places results
        if (result.id.startsWith('google_')) {
          const googlePlaceId = result.id.replace('google_', '');
          setLocation(`/restaurants/google/${googlePlaceId}`);
        } else {
          setLocation(`/restaurants/${result.id}`);
        }
        onOpenChange(false);
        break;
      case 'list':
        setLocation(`/lists/${result.id}`);
        onOpenChange(false);
        break;
      case 'post':
        setLocation(`/posts/${result.id}`);
        onOpenChange(false);
        break;
      case 'user':
        setLocation(`/profile/${result.id}`);
        onOpenChange(false);
        break;
    }
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchQuery(term);
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
      <DialogContent className="max-w-2xl max-h-[80vh] p-0" aria-describedby="search-description">
        <div className="sr-only">
          <h2 id="search-title">Search</h2>
          <p id="search-description">Search for restaurants, lists, posts, and people</p>
        </div>
        {/* Search Header */}
        <div className="p-6 pb-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search restaurants, lists, posts, people…"
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
                    Searching near {userLocation.city || `${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}`}
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
                  {recentSearches.map((term, index) => (
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
                    {Object.entries(searchResults || {}).map(([type, items]) => (
                      <TabsContent key={type} value={type} className="m-0 p-6">
                        <div className="space-y-2">
                          {items.map((result: SearchResult) => (
                            <Button
                              key={result.id}
                              variant="ghost"
                              className="w-full h-auto p-3 justify-start"
                              onClick={() => handleResultClick(result)}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="flex-shrink-0">
                                  {result.thumbnailUrl ? (
                                    <img 
                                      src={result.thumbnailUrl} 
                                      alt={result.name}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                      {getResultIcon(result.type)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="font-medium text-sm">{result.name}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    {result.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {result.location}
                                      </span>
                                    )}
                                    {result.avgRating && (
                                      <span className="flex items-center gap-1">
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        {typeof result.avgRating === 'number' && !isNaN(result.avgRating) ? result.avgRating.toFixed(1) : '4.0'}
                                      </span>
                                    )}
                                    {result.subtitle && !result.location && !result.avgRating && (
                                      <span>{result.subtitle}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
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