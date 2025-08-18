
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Star, DollarSign, Navigation, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { locationService } from '@/services/locationService';

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
}

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
  const [, navigate] = useLocation();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search function with debouncing - wrapped in useCallback to prevent recreation
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
      
      // Apply prioritization framework:
      // 1. Google Places results first (verified = true, source = 'google_places')
      // 2. Exact name matches
      // 3. High relevance scores
      // 4. High ratings
      // 5. Distance (if location available)
      const prioritizedResults = restaurants
        .sort((a: SearchResult, b: SearchResult) => {
          // Priority 1: Google Places results
          const aIsGoogle = a.source === 'google_places' || a.googlePlaceId;
          const bIsGoogle = b.source === 'google_places' || b.googlePlaceId;
          
          if (aIsGoogle && !bIsGoogle) return -1;
          if (!aIsGoogle && bIsGoogle) return 1;

          // Priority 2: Exact name matches
          const aExactMatch = a.name.toLowerCase() === searchQuery.toLowerCase();
          const bExactMatch = b.name.toLowerCase() === searchQuery.toLowerCase();
          
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;

          // Priority 3: Relevance score
          const aRelevance = a.relevanceScore || 0;
          const bRelevance = b.relevanceScore || 0;
          
          if (aRelevance !== bRelevance) {
            return bRelevance - aRelevance;
          }

          // Priority 4: Rating
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          
          if (aRating !== bRating) {
            return bRating - aRating;
          }

          // Priority 5: Distance (closer is better)
          if (a.distance && b.distance) {
            return a.distance - b.distance;
          }

          return 0;
        })
        .slice(0, 20); // Limit to top 20 results

      setSearchResults(prioritizedResults);
      console.log(`🎯 Prioritized ${prioritizedResults.length} results`);
      
    } catch (error) {
      console.error('🔍 Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [location]); // Dependency on location only

  // Handle search input with debouncing - wrapped in useCallback
  const handleSearchChange = React.useCallback((value: string) => {
    setQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  // Navigate to restaurant page - wrapped in useCallback
  const handleRestaurantClick = React.useCallback((restaurant: SearchResult) => {
    console.log('🏪 Navigating to restaurant:', restaurant);
    
    // For Google Places results, use the googlePlaceId parameter
    if (restaurant.googlePlaceId && restaurant.source === 'google_places') {
      navigate(`/restaurants?googlePlaceId=${restaurant.googlePlaceId}`);
    } else {
      // For database results, use the regular ID
      navigate(`/restaurants/${restaurant.id}`);
    }
  }, [navigate]);

  // Format price range for display
  const formatPriceRange = (priceRange: string) => {
    const priceMap: { [key: string]: string } = {
      '$': 'Budget-friendly',
      '$$': 'Moderate',
      '$$$': 'Expensive',
      '$$$$': 'Very Expensive'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Search Restaurants</h1>
            
            {/* Location Status */}
            <div className="flex items-center space-x-2 text-sm">
              {locationStatus === 'loading' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-gray-600">Getting location...</span>
                </>
              )}
              
              {locationStatus === 'success' && location && (
                <>
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-gray-600">
                    {location.city || location.address || 'Location detected'}
                  </span>
                </>
              )}
              
              {locationStatus === 'error' && (
                <>
                  <Navigation className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-600">Using default location</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getUserLocation}
                    className="ml-2"
                  >
                    Retry
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for restaurants, cuisines, or dishes..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-lg"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-blue-500" />
          )}
        </div>

        {/* Search Info */}
        {query.length >= 2 && (
          <div className="mb-4 text-sm text-gray-600">
            {isSearching ? (
              'Searching...'
            ) : (
              <>
                Found {searchResults.length} restaurants
                {location && ` near ${location.city || 'your location'}`}
              </>
            )}
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-3">
          {searchResults.map((restaurant) => (
            <Card 
              key={`${restaurant.source}-${restaurant.id || restaurant.googlePlaceId}`}
              className="group hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 cursor-pointer border border-gray-100 hover:border-gray-200 bg-white rounded-xl overflow-hidden"
              onClick={() => handleRestaurantClick(restaurant)}
            >
              <CardContent className="p-0">
                <div className="flex items-start space-x-0">
                  {/* Restaurant Image */}
                  <div className="flex-shrink-0 relative">
                    {restaurant.imageUrl ? (
                      <div className="relative w-20 h-20 overflow-hidden">
                        <img
                          src={restaurant.imageUrl}
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent group-hover:from-black/20 transition-colors duration-200" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Search className="h-7 w-7 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Restaurant Info */}
                  <div className="flex-1 min-w-0 p-4 pr-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900 truncate leading-tight">
                                {restaurant.name}
                              </h3>
                              
                              {/* Source Badge */}
                              {restaurant.source === 'google_places' && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-200 text-blue-700 bg-blue-50">
                                  Verified
                                </Badge>
                              )}
                            </div>

                            {/* Address */}
                            <p className="text-sm text-gray-600 mb-3 line-clamp-1 leading-relaxed">
                              {restaurant.address || restaurant.city}
                            </p>
                          </div>
                        </div>

                        {/* Rating, Price, Distance - Redesigned as pills */}
                        <div className="flex items-center flex-wrap gap-2">
                          {/* Rating Pill */}
                          {restaurant.rating > 0 && (
                            <div className="inline-flex items-center space-x-1.5 bg-yellow-50 text-yellow-800 px-2.5 py-1 rounded-full border border-yellow-200">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{restaurant.rating.toFixed(1)}</span>
                              {restaurant.reviewCount > 0 && (
                                <span className="text-xs text-yellow-600">
                                  ({restaurant.reviewCount.toLocaleString()})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Price Range Pill */}
                          {restaurant.priceRange && (
                            <div className="inline-flex items-center space-x-1.5 bg-green-50 text-green-800 px-2.5 py-1 rounded-full border border-green-200">
                              <DollarSign className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-sm font-medium">
                                {formatPriceRange(restaurant.priceRange)}
                              </span>
                            </div>
                          )}

                          {/* Distance Pill */}
                          {restaurant.distance && (
                            <div className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
                              <MapPin className="h-3.5 w-3.5 text-blue-600" />
                              <span className="text-sm font-medium">
                                {formatDistance(restaurant.distance)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action indicator */}
                      <div className="flex-shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Empty State */}
        {query.length >= 2 && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600">
              Try searching for a different restaurant, cuisine, or location.
            </p>
          </div>
        )}

        {/* Search Tips */}
        {query.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Discover great restaurants</h3>
            <p className="text-gray-600 mb-4">
              Search for restaurants, cuisines, or dishes to get started.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Pizza', 'Sushi', 'Brunch', 'Italian', 'Thai', 'Coffee'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearchChange(suggestion)}
                >
                  {suggestion}
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
