import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Star, Clock, Navigation, Loader2 } from "lucide-react";
import { LocationService, type LocationData } from '@/services/locationService';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Restaurant {
  id: number;
  name: string;
  location: string;
  category?: string;
  priceRange?: string;
  imageUrl?: string;
  averageRating?: number;
  totalPosts?: number;
}

interface RestaurantSearchComponentProps {
  onSelect: (restaurant: Restaurant) => void;
  placeholder?: string;
  className?: string;
  showLocationServices?: boolean;
  autoRequestLocation?: boolean;
}

export function RestaurantSearchComponent({ 
  onSelect, 
  placeholder = "Search for restaurants...",
  className = "",
  showLocationServices = true,
  autoRequestLocation = true
}: RestaurantSearchComponentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const { toast } = useToast();

  // Enhanced search with location services
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search/unified", searchTerm, location?.lat, location?.lng],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      const params = new URLSearchParams({
        q: searchTerm,
        type: 'restaurants'
      });
      
      // Include location for better local results
      if (location?.lat && location?.lng) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
        params.append('radius', '10000'); // 10km radius
      }
      
      const response = await fetch(`/api/search/unified?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      console.log("Search API response:", data);
      // Handle both array response and object with restaurants property
      if (Array.isArray(data)) {
        return data;
      }
      return data.restaurants || [];
    },
    enabled: searchTerm.length > 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Location services integration
  const requestLocation = async () => {
    setIsLocationLoading(true);
    try {
      const locationData = await LocationService.getInstance().getCurrentLocation();
      setLocation(locationData);
      toast({
        title: "Location enabled",
        description: "Now showing restaurants near you",
      });
    } catch (error) {
      console.error('Location error:', error);
      toast({
        title: "Location unavailable",
        description: "Using general search results",
        variant: "destructive"
      });
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Auto-request location on mount
  useEffect(() => {
    if (autoRequestLocation) {
      requestLocation();
    }
  }, [autoRequestLocation]);

  const handleSelect = (restaurant: Restaurant) => {
    onSelect(restaurant);
    setSearchTerm("");
    setShowResults(false);
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowResults(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Location Status Bar */}
      {showLocationServices && (
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-2">
            {location ? (
              <>
                <MapPin className="h-3 w-3 text-green-500" />
                <span>Searching near {location.city || 'your location'}</span>
              </>
            ) : (
              <>
                <MapPin className="h-3 w-3" />
                <span>General search</span>
              </>
            )}
          </div>
          {!location && (
            <Button
              variant="ghost"
              size="sm"
              onClick={requestLocation}
              disabled={isLocationLoading}
              className="h-6 px-2 text-xs"
            >
              {isLocationLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Navigation className="h-3 w-3 mr-1" />
                  Enable location
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={location ? "Search restaurants near you..." : placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10"
        />
      </div>

      {showResults && searchTerm.length > 2 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((restaurant: Restaurant) => (
                  <div
                    key={restaurant.id}
                    onClick={() => handleSelect(restaurant)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {restaurant.imageUrl ? (
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {restaurant.name}
                      </h4>
                      
                      {restaurant.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {restaurant.location}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        {restaurant.averageRating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{restaurant.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                        
                        {restaurant.category && (
                          <Badge variant="outline" className="text-xs">
                            {restaurant.category}
                          </Badge>
                        )}
                        
                        {restaurant.priceRange && (
                          <span className="text-xs text-muted-foreground">
                            {restaurant.priceRange}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No restaurants found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}