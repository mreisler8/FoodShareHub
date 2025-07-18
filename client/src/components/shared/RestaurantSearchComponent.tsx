import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface RestaurantSearchProps {
  onSelect: (restaurant: any) => void;
  placeholder?: string;
  className?: string;
  showRecentSearches?: boolean;
  initialValue?: string;
}

interface Restaurant {
  id: string;
  name: string;
  location: string;
  cuisine?: string;
  rating?: number;
  source: 'database' | 'google';
  priceLevel?: number;
  isOpen?: boolean;
}

export function RestaurantSearchComponent({
  onSelect,
  placeholder = "Search for restaurants...",
  className = "",
  showRecentSearches = true,
  initialValue = ""
}: RestaurantSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [showResults, setShowResults] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { user } = useAuth();

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied or unavailable');
        }
      );
    }
  }, []);

  // Search restaurants with debouncing
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['/api/search/restaurants', searchQuery, userLocation],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        type: 'restaurants',
        limit: '8'
      });

      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
      }

      const response = await apiRequest(`/api/search/restaurants?${params}`);
      return response.restaurants || [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get recent searches
  const { data: recentSearches = [] } = useQuery({
    queryKey: ['/api/search/recent-searches'],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequest('/api/search/recent-searches');
      return response.searches || [];
    },
    enabled: showRecentSearches && !!user && searchQuery.length === 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowResults(value.length >= 1);
    if (value.length === 0) {
      setSelectedRestaurant(null);
      setShowResults(showRecentSearches);
    }
  };

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setSearchQuery(restaurant.name);
    setShowResults(false);
    onSelect(restaurant);
  };

  const handleRecentSearchSelect = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    setShowResults(true);
  };

  const renderRestaurantCard = (restaurant: Restaurant) => (
    <div
      key={`${restaurant.source}-${restaurant.id}`}
      onClick={() => handleRestaurantSelect(restaurant)}
      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm">{restaurant.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">{restaurant.location}</span>
          </div>
          {restaurant.cuisine && (
            <Badge variant="secondary" className="mt-1 text-xs">
              {restaurant.cuisine}
            </Badge>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {restaurant.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
              <span className="text-xs text-gray-600">{restaurant.rating}</span>
            </div>
          )}
          {restaurant.source === 'google' && (
            <Badge variant="outline" className="text-xs">Google</Badge>
          )}
        </div>
      </div>
    </div>
  );

  const renderRecentSearches = () => (
    <div className="p-3 border-b">
      <h5 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Recent Searches
      </h5>
      <div className="space-y-1">
        {recentSearches.slice(0, 3).map((search: any, index: number) => (
          <button
            key={index}
            onClick={() => handleRecentSearchSelect(search.query)}
            className="block w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1"
          >
            {search.query}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="pl-10 pr-4"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto shadow-lg">
          <CardContent className="p-0">
            {searchQuery.length === 0 && showRecentSearches && recentSearches.length > 0 && (
              renderRecentSearches()
            )}
            
            {searchQuery.length >= 2 && (
              <>
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Searching restaurants...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {searchResults.map(renderRestaurantCard)}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <Search className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                    No restaurants found for "{searchQuery}"
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}