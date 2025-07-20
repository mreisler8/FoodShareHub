import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, MapPin, Star, Loader2, Navigation, UtensilsCrossed } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { LocationService, type LocationData } from '@/services/locationService';

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  cuisine?: string;
  avgRating?: number;
  source?: string;
}

interface RestaurantSearchInputProps {
  onSelect: (restaurant: Restaurant) => void;
  selectedRestaurant: Restaurant | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function RestaurantSearchInput({
  onSelect,
  selectedRestaurant,
  placeholder = "Search for a restaurant...",
  required = false,
  className = ""
}: RestaurantSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(selectedRestaurant?.name || '');
  const [showResults, setShowResults] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Location service integration - same as homepage
  useEffect(() => {
    // Auto-request location when component mounts
    if (locationPermission === null) {
      requestLocation();
    }
  }, [locationPermission]);

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

  // Restaurant search with location integration - EXACTLY same API as homepage
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['/api/search/unified', { q: debouncedQuery, location: userLocation }],
    queryFn: async () => {
      // Use EXACT same URL format as homepage search
      let searchUrl = `/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`;

      // Add location parameters if available (same as homepage)
      if (userLocation) {
        searchUrl += `&lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10000`;
      }

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000) // Same timeout as homepage
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();

      // Process results EXACTLY like homepage - use the restaurants array from the response
      const restaurants = (data.restaurants || []).map((restaurant: any) => ({
        id: restaurant.id?.toString() || '',
        name: restaurant.name || '',
        location: restaurant.location || restaurant.subtitle || '',
        cuisine: restaurant.cuisine || restaurant.category || '',
        avgRating: typeof restaurant.avgRating === 'number' && !isNaN(restaurant.avgRating) ? restaurant.avgRating : 4.0,
        source: restaurant.source || 'database'
      }));

      return restaurants;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const handleLocationRequest = async () => {
    await requestLocation();
  };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(value.length >= 2);

    // Clear selected restaurant if user starts typing again
    if (selectedRestaurant && value !== selectedRestaurant.name) {
      onSelect(null as any);
    }
  };

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSearchQuery(restaurant.name);
    setShowResults(false);
    onSelect(restaurant);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (searchQuery.length >= 2) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow clicking
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Location status bar - matching homepage design */}
      {locationPermission === 'granted' && userLocation && (
        <div className="flex items-center gap-2 text-xs text-green-600 mb-3">
          <Navigation className="h-3 w-3" />
          <span>
            Searching near {userLocation.city && userLocation.city !== `${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}` 
              ? userLocation.city 
              : 'Current Location'}
          </span>
        </div>
      )}

      {locationPermission === 'denied' && (
        <div className="flex items-center gap-2 text-xs text-orange-600 mb-3">
          <Navigation className="h-3 w-3" />
          <span>Enable location for better local results</span>
        </div>
      )}

      {locationPermission === 'prompt' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Navigation className="h-3 w-3 animate-pulse" />
          <span>Requesting location access...</span>
        </div>
      )}

      {!locationPermission && (
        <div className="flex items-center gap-2 text-xs text-orange-600 mb-3">
          <Navigation className="h-3 w-3" />
          <span>Enable location for better local results</span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-10 pr-12"
          required={required}
        />

        {/* Simplified location button - only when needed */}
        {locationPermission !== 'granted' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0"
            onClick={handleLocationRequest}
            title="Enable location for better results"
          >
            <Navigation className="h-4 w-4 text-gray-600" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Searching...</span>
            </div>
          ) : restaurants.length > 0 ? (
            <div className="py-2">
              {restaurants.slice(0, 5).map((restaurant) => (
                <button
                  key={restaurant.id}
                  type="button"
                  onClick={() => handleSelectRestaurant(restaurant)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{restaurant.name}</p>
                      {restaurant.avgRating > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{restaurant.avgRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{restaurant.location}</p>
                    {restaurant.cuisine && (
                      <p className="text-xs text-gray-400">{restaurant.cuisine}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : debouncedQuery.length >= 2 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No restaurants found for "{debouncedQuery}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}