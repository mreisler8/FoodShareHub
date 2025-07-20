import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, MapPin, Star, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  // Debounced search
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search/unified", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      return data.restaurants || [];
    },
    enabled: searchTerm.length > 2,
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search restaurants to add to your list..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsSearching(true);
          }}
          className="pl-10"
        />
      </div>

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
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No restaurants found</p>
                <p className="text-sm">Try searching for a different name or location</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}