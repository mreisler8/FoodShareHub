
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Star, DollarSign, Navigation, Loader2, X, TrendingUp, Clock, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { locationService, type LocationData } from '@/services/locationService';
import { LocationControls } from '@/components/search/LocationControls';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  city: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  googlePlaceId: string;
  source: string;
  relevanceScore: number;
  distance?: number;
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Popular search suggestions
  const popularSearches = ['Pizza', 'Sushi', 'Brunch', 'Italian', 'Thai', 'Coffee', 'Mexican', 'Ramen'];
  const recentSearches = ['Tacos', 'Burger']; // This would come from local storage in production

  const getUserLocation = React.useCallback(async () => {
    setLocationStatus('loading');
    try {
      console.log('🌍 Getting user location...');
      const locationData = await locationService.getCurrentLocation();
      console.log('🌍 Location obtained:', locationData);
      setLocation(locationData);
      setLocationStatus('success');
    } catch (error) {
      console.error('🌍 Location error:', error);
      setLocationStatus('error');
      // Set default location (Toronto for demo)
      setLocation({
        lat: 43.6532,
        lng: -79.3832,
        address: 'Toronto, ON, Canada',
        city: 'Toronto',
        country: 'Canada'
      });
    }
  }, []);

  // Get user location on page load
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  // Auto-focus search input
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search function with debouncing
  const performSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      console.log(`🔍 Searching for: "${searchQuery}" with location:`, location);

      let searchUrl = `/api/search/unified?q=${encodeURIComponent(searchQuery)}&type=restaurants`;

      // Add location parameters for geo-aware search
      if (location) {
        searchUrl += `&lat=${location.lat}&lng=${location.lng}&radius=25000`;
      }

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Search results:', data);

      // Extract restaurants from results
      const restaurants = data.results?.restaurants || data.restaurants || [];

      // Apply prioritization framework
      const prioritizedResults = restaurants
        .sort((a: SearchResult, b: SearchResult) => {
          const aIsGoogle = a.source === 'google_places' || a.googlePlaceId;
          const bIsGoogle = b.source === 'google_places' || b.googlePlaceId;

          if (aIsGoogle && !bIsGoogle) return -1;
          if (!aIsGoogle && bIsGoogle) return 1;

          const aExactMatch = a.name.toLowerCase() === searchQuery.toLowerCase();
          const bExactMatch = b.name.toLowerCase() === searchQuery.toLowerCase();

          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;

          const aRelevance = a.relevanceScore || 0;
          const bRelevance = b.relevanceScore || 0;

          if (aRelevance !== bRelevance) {
            return bRelevance - aRelevance;
          }

          const aRating = a.rating || 0;
          const bRating = b.rating || 0;

          if (aRating !== bRating) {
            return bRating - aRating;
          }

          if (a.distance && b.distance) {
            return a.distance - b.distance;
          }

          return 0;
        })
        .slice(0, 20);

      setSearchResults(prioritizedResults);
      console.log(`🎯 Prioritized ${prioritizedResults.length} results`);

    } catch (error) {
      console.error('🔍 Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [location]);

  // Handle search input with debouncing
  const handleSearchChange = React.useCallback((value: string) => {
    setQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  // Navigate to restaurant page
  const handleRestaurantClick = React.useCallback((restaurant: SearchResult) => {
    console.log('🏪 Navigating to restaurant:', restaurant);

    if (restaurant.googlePlaceId && restaurant.source === 'google_places') {
      navigate(`/restaurants/google/${restaurant.googlePlaceId}`);
    } else {
      navigate(`/restaurants/${restaurant.id}`);
    }
  }, [navigate]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearchChange(suggestion);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Format price range for display
  const formatPriceRange = (priceRange: string) => {
    const priceMap: { [key: string]: string } = {
      '$': 'Budget',
      '$$': 'Moderate',
      '$$$': 'Upscale',
      '$$$$': 'Fine Dining'
    };
    return priceMap[priceRange] || priceRange;
  };

  // Format distance for display
  const formatDistance = (distance?: number) => {
    if (!distance) return null;

    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  const setUserLocation = (loc: LocationData | null) => {
    setLocation(loc);
    if (query) {
      performSearch(query);
    }
  };

  // Location status indicator
  const getLocationStatusIndicator = () => {
    switch (locationStatus) {
      case 'loading':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />;
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Enhanced Header with Floating Search Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header Title */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Find Restaurants</h1>
              <p className="text-gray-600 text-sm">Discover great places recommended by your circles</p>
            </div>
            
            {/* Location Status & Controls */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {getLocationStatusIndicator()}
                <span className="hidden sm:inline">
                  {locationStatus === 'loading' && 'Getting location...'}
                  {locationStatus === 'success' && (location?.city || 'Location found')}
                  {locationStatus === 'error' && 'Location unavailable'}
                  {locationStatus === 'idle' && 'Enable location'}
                </span>
              </div>
              <LocationControls 
                onLocationChange={(location) => {
                  if (location) {
                    setUserLocation(location);
                    setLocationStatus('success');
                  } else {
                    setUserLocation(null);
                    setLocationStatus('idle');
                  }
                }} 
              />
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="relative">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search for restaurants, cuisines, or dishes..."
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 pr-20 py-4 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-2xl bg-white shadow-sm group-focus-within:shadow-md transition-all duration-200"
              />
              
              {/* Clear button */}
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
              
              {/* Loading indicator */}
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-blue-500" />
              )}
            </div>

            {/* Search Info Bar */}
            {query.length >= 2 && (
              <div className="flex items-center justify-between mt-3 text-sm">
                <div className="text-gray-600">
                  {isSearching ? (
                    <span className="flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Searching...
                    </span>
                  ) : (
                    <>
                      <span className="font-medium">{searchResults.length}</span> restaurants found
                      {location && <span className="text-gray-500"> near {location.city}</span>}
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-1"
                >
                  <Filter className="h-3 w-3" />
                  <span>Filters</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Suggestions - Only show when no query */}
        {query.length === 0 && (
          <div className="space-y-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <h3 className="font-medium text-gray-900">Recent Searches</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleSuggestionClick(search)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-full text-sm hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">Popular Right Now</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => handleSuggestionClick(search)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full text-sm font-medium text-gray-700 hover:from-blue-100 hover:to-purple-100 hover:border-blue-300 transition-all duration-200"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>

            {/* Welcome Message */}
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Discover Great Restaurants</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Search for restaurants, cuisines, or specific dishes to find your next great meal.
              </p>
            </div>
          </div>
        )}

        {/* Search Results */}
        {query.length >= 2 && (
          <div className="space-y-4">
            {searchResults.map((restaurant) => (
              <Card
                key={`${restaurant.source}-${restaurant.id || restaurant.googlePlaceId}`}
                className="group hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 cursor-pointer border-0 shadow-md hover:scale-[1.02] bg-white rounded-2xl overflow-hidden"
                onClick={() => handleRestaurantClick(restaurant)}
              >
                <CardContent className="p-0">
                  <div className="flex items-start space-x-0">
                    {/* Restaurant Image */}
                    <div className="flex-shrink-0 relative">
                      {restaurant.imageUrl ? (
                        <div className="relative w-24 h-24 overflow-hidden rounded-l-2xl">
                          <img
                            src={restaurant.imageUrl}
                            alt={restaurant.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/30 transition-colors duration-300" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center rounded-l-2xl">
                          <Search className="h-8 w-8 text-blue-500" />
                        </div>
                      )}

                      {/* Source Verification Badge */}
                      {restaurant.source === 'google_places' && (
                        <div className="absolute -top-1 -right-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-blue-300 text-blue-700 bg-white shadow-sm">
                            ✓
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Restaurant Info */}
                    <div className="flex-1 min-w-0 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Restaurant Name & Address */}
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 truncate leading-tight mb-1 group-hover:text-blue-900 transition-colors">
                              {restaurant.name}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-1 leading-relaxed">
                              {restaurant.address || restaurant.city}
                            </p>
                          </div>

                          {/* Enhanced Info Pills */}
                          <div className="flex items-center flex-wrap gap-2">
                            {/* Rating Pill */}
                            {restaurant.rating > 0 && (
                              <div className="inline-flex items-center space-x-1.5 bg-yellow-50 text-yellow-800 px-3 py-1.5 rounded-full border border-yellow-200">
                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                                <span className="text-sm font-bold">{restaurant.rating.toFixed(1)}</span>
                                {restaurant.reviewCount > 0 && (
                                  <span className="text-xs text-yellow-600">
                                    ({restaurant.reviewCount.toLocaleString()})
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Price Range Pill */}
                            {restaurant.priceRange && (
                              <div className="inline-flex items-center space-x-1.5 bg-green-50 text-green-800 px-3 py-1.5 rounded-full border border-green-200">
                                <DollarSign className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-sm font-medium">
                                  {formatPriceRange(restaurant.priceRange)}
                                </span>
                              </div>
                            )}

                            {/* Distance Pill */}
                            {restaurant.distance && (
                              <div className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full border border-blue-200">
                                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                                <span className="text-sm font-medium">
                                  {formatDistance(restaurant.distance)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Enhanced Action Indicator */}
                        <div className="flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Enhanced Empty State */}
        {query.length >= 2 && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No restaurants found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We couldn't find any restaurants matching "{query}". Try searching for a different cuisine or location.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {popularSearches.slice(0, 4).map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-full"
                >
                  Try "{suggestion}"
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
