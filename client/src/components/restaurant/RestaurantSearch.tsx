
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Restaurant } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, PlusCircle, MapPin, Store, Phone, Star } from "lucide-react";
import { debounce } from "@/lib/utils";

interface RestaurantSearchResult {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  avgRating: number;
  location?: string;
  category?: string;
  priceRange?: string;
  cuisine?: string;
  address?: string;
  source: 'database' | 'google';
}

interface RestaurantSearchProps {
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onCreateNewRestaurant?: () => void;
  buttonLabel?: string;
  placeholder?: string;
}

export function RestaurantSearch({
  onSelectRestaurant,
  onCreateNewRestaurant,
  buttonLabel = "Select Restaurant",
  placeholder = "Search for restaurants..."
}: RestaurantSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Set up debounced search
  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    handler();
    return () => handler.cancel();
  }, [searchQuery]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  // Fetch restaurant search results with consistent API
  const { data: restaurants, isLoading, error } = useQuery<RestaurantSearchResult[]>({
    queryKey: ['/api/search', { type: 'restaurants', q: debouncedQuery }],
    queryFn: async () => {
      const response = await fetch(`/api/search?type=restaurants&q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(errorData.error || 'Search failed');
      }
      return response.json();
    },
    enabled: isOpen && debouncedQuery.length >= 2,
    staleTime: 30000,
    retry: 2,
    retryDelay: 1000,
  });
  
  // Handle restaurant selection
  const handleSelectRestaurant = (restaurant: RestaurantSearchResult) => {
    // Convert search result to Restaurant format
    const restaurantData: Restaurant = {
      id: parseInt(restaurant.id),
      name: restaurant.name,
      location: restaurant.location || '',
      category: restaurant.category || 'Restaurant',
      priceRange: restaurant.priceRange || '$',
      imageUrl: restaurant.thumbnailUrl || null,
      cuisine: restaurant.cuisine || null,
      address: restaurant.address || null,
      // Add other required fields with defaults
      openTableId: null,
      resyId: null,
      googlePlaceId: null,
      neighborhood: null,
      city: null,
      state: null,
      country: 'US',
      postalCode: null,
      latitude: null,
      longitude: null,
      phone: null,
      website: null,
      hours: null,
      description: null,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    onSelectRestaurant(restaurantData);
    setIsOpen(false);
    setSearchQuery("");
  };
  
  // Handle create new restaurant button click
  const handleCreateNew = () => {
    if (onCreateNewRestaurant) {
      onCreateNewRestaurant();
    }
    setIsOpen(false);
    setSearchQuery("");
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-left font-normal h-10 px-3"
      >
        <Search className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="text-muted-foreground">{placeholder}</span>
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Find a Restaurant</DialogTitle>
            <DialogDescription>
              Search for existing restaurants or add a new one if it's not listed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Improved search input with proper spacing */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search by name, location, or cuisine..."
                className="pl-10 h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Results container with fixed height and scroll */}
            <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
              {/* Error state */}
              {error && (
                <div className="text-center py-8">
                  <p className="text-red-500">Search failed. Please try again.</p>
                </div>
              )}
              
              {/* Loading state */}
              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* No results state */}
              {!isLoading && !error && debouncedQuery.length >= 2 && (!restaurants || restaurants.length === 0) && (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">No restaurants found</p>
                    <p className="text-muted-foreground">No restaurants match "{debouncedQuery}"</p>
                  </div>
                  {onCreateNewRestaurant && (
                    <Button onClick={handleCreateNew} className="mt-4">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add New Restaurant
                    </Button>
                  )}
                </div>
              )}
              
              {/* Start typing prompt */}
              {!isLoading && !error && debouncedQuery.length < 2 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Type at least 2 characters to start searching...
                  </p>
                </div>
              )}
              
              {/* Results */}
              {!isLoading && !error && restaurants && restaurants.length > 0 && (
                <div className="space-y-2">
                  {restaurants.map((restaurant) => (
                    <Card 
                      key={restaurant.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelectRestaurant(restaurant)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {/* Restaurant image or placeholder */}
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                              {restaurant.thumbnailUrl ? (
                                <img 
                                  src={restaurant.thumbnailUrl} 
                                  alt={restaurant.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Store className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            
                            {/* Restaurant details */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{restaurant.name}</h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                {restaurant.location && (
                                  <span className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {restaurant.location}
                                  </span>
                                )}
                                {restaurant.category && (
                                  <span>{restaurant.category}</span>
                                )}
                                {restaurant.priceRange && (
                                  <span>{restaurant.priceRange}</span>
                                )}
                              </div>
                              {restaurant.avgRating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-muted-foreground">
                                    {typeof restaurant.avgRating === 'number' 
                                      ? restaurant.avgRating.toFixed(1) 
                                      : parseFloat(restaurant.avgRating).toFixed(1)
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Select button */}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRestaurant(restaurant);
                            }}
                          >
                            {buttonLabel}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer actions */}
            {onCreateNewRestaurant && restaurants && restaurants.length > 0 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Can't find what you're looking for?
                </p>
                <Button variant="outline" onClick={handleCreateNew}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add New Restaurant
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
