import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, MapPin, Star, Clock, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocationService, type LocationData } from '@/services/locationService';
import { useDebounce } from '@/hooks/useDebounce';

interface Restaurant {
  id: number;
  name: string;
  location: string;
  category: string;
  priceRange: string;
  imageUrl?: string;
  averageRating?: number;
  totalPosts?: number;
}

interface RestaurantSearchAndAddProps {
  onAddRestaurant: (restaurant: Restaurant) => void;
  addedRestaurants: Restaurant[];
}

export default function RestaurantSearchAndAdd({ onAddRestaurant, addedRestaurants }: RestaurantSearchAndAddProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);

  const debouncedQuery = useDebounce(searchTerm, 300);

  // Initialize location services like the homepage
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const permission = await LocationService.checkPermission();
        setLocationPermission(permission);
        
        if (permission === 'granted') {
          const location = await LocationService.getCurrentLocation();
          if (location) {
            setUserLocation(location);
          }
        }
      } catch (error) {
        console.error('Location initialization error:', error);
        setLocationPermission('denied');
      }
    };

    initializeLocation();
  }, []);

  // Location-aware search query - exactly like homepage
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search/unified", debouncedQuery, userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      
      const params = new URLSearchParams({
        q: debouncedQuery
      });
      
      // Add location parameters if available (same as homepage)
      if (userLocation?.lat && userLocation?.lng) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', '10000'); // 10km radius
      }
      
      const response = await fetch(`/api/search/unified?${params.toString()}`);
      const data = await response.json();
      return data.restaurants || [];
    },
    enabled: debouncedQuery.length > 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleAddRestaurant = (restaurant: Restaurant) => {
    onAddRestaurant(restaurant);
    setSearchTerm("");
    setIsSearching(false);
  };

  const isRestaurantAdded = (restaurantId: number) => {
    return addedRestaurants.some(r => r.id === restaurantId);
  };

  // Get recent searches from localStorage
  const getRecentSearches = () => {
    try {
      const recent = localStorage.getItem('recent-restaurant-searches');
      return recent ? JSON.parse(recent).slice(0, 5) : [];
    } catch {
      return [];
    }
  };

  const saveRecentSearch = (term: string) => {
    try {
      const recent = getRecentSearches();
      const updated = [term, ...recent.filter(s => s !== term)].slice(0, 10);
      localStorage.setItem('recent-restaurant-searches', JSON.stringify(updated));
    } catch (error) {
      // Ignore localStorage errors
    }
  };

  const requestLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setUserLocation(location);
        setLocationPermission('granted');
      }
    } catch (error) {
      setLocationPermission('denied');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Location Services Integration */}
        {locationPermission !== 'granted' && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Navigation className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">Enable location for better results</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={requestLocation}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              Enable
            </Button>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={userLocation ? "Search restaurants near you..." : "Search restaurants to add to your list..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearching(true);
              if (e.target.value.trim()) {
                saveRecentSearch(e.target.value.trim());
              }
            }}
            className="pl-10"
          />
          {userLocation && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                📍 Location enabled
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Recent Searches */}
      {!isSearching && !searchTerm && getRecentSearches().length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h4>
          <div className="flex flex-wrap gap-2">
            {getRecentSearches().map((term, index) => (
              <button
                key={index}
                type="button"
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                onClick={() => {
                  setSearchTerm(term);
                  setIsSearching(true);
                }}
              >
                <Clock className="h-3 w-3 inline mr-1" />
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {isSearching && searchTerm.length > 2 && (
        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : searchResults?.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Search Results</h4>
                {searchResults.map((restaurant: Restaurant) => (
                  <div
                    key={restaurant.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        {restaurant.imageUrl ? (
                          <img 
                            src={restaurant.imageUrl} 
                            alt={restaurant.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {restaurant.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium">{restaurant.name}</h5>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{restaurant.location}</span>
                          <Badge variant="secondary" className="text-xs">
                            {restaurant.category}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium">{restaurant.priceRange}</span>
                          {restaurant.averageRating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-muted-foreground">
                                {restaurant.averageRating}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddRestaurant(restaurant)}
                      disabled={isRestaurantAdded(restaurant.id)}
                    >
                      {isRestaurantAdded(restaurant.id) ? (
                        "Added"
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground space-y-4">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <div>
                  <p>No restaurants found for "{searchTerm}"</p>
                  <p className="text-sm">Try searching for a different name or location</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Can't find it?</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Create manual restaurant entry
                      const manualRestaurant = {
                        id: Math.random() * 1000000, // Temporary ID
                        name: searchTerm,
                        location: "Location not specified",
                        category: "Restaurant",
                        priceRange: "$$",
                        averageRating: 0
                      };
                      handleAddRestaurant(manualRestaurant);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add "{searchTerm}" manually</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}