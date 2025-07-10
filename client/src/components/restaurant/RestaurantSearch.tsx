import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Plus, Loader2 } from 'lucide-react';
import { debounce } from 'lodash';

interface RestaurantSearchResult {
  id: string;
  name: string;
  location?: string;
  category?: string;
  priceRange?: string;
  cuisine?: string;
  address?: string;
  thumbnailUrl?: string;
  avgRating?: number;
  source?: 'database' | 'google';
  googlePlaceId?: string;
}

interface RestaurantSearchProps {
  onSelectRestaurant: (restaurant: RestaurantSearchResult) => void;
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
    console.log('Selected restaurant:', restaurant);
    onSelectRestaurant(restaurant);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Handle creating new restaurant
  const handleCreateNew = () => {
    if (onCreateNewRestaurant) {
      onCreateNewRestaurant();
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-left font-normal"
      >
        <Search className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Search Restaurants</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading && debouncedQuery.length >= 2 && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-red-500">
                    Search failed. Please try again.
                  </span>
                </div>
              )}

              {!isLoading && !error && debouncedQuery.length >= 2 && (
                <>
                  {restaurants && restaurants.length > 0 ? (
                    <div className="space-y-2">
                      {restaurants.map((restaurant) => (
                        <Button
                          key={restaurant.id}
                          variant="ghost"
                          className="w-full h-auto p-3 justify-start"
                          onClick={() => handleSelectRestaurant(restaurant)}
                        >
                          <div className="flex items-start gap-3 w-full text-left">
                            <div className="flex-shrink-0">
                              {restaurant.thumbnailUrl ? (
                                <img 
                                  src={restaurant.thumbnailUrl} 
                                  alt={restaurant.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {restaurant.name}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                {restaurant.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{restaurant.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  {restaurant.category && (
                                    <span className="bg-muted px-1 py-0.5 rounded text-xs">
                                      {restaurant.category}
                                    </span>
                                  )}
                                  {restaurant.priceRange && (
                                    <span className="text-xs">
                                      {restaurant.priceRange}
                                    </span>
                                  )}
                                  {restaurant.source === 'google' && (
                                    <span className="text-xs text-blue-600">
                                      Google Places
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Search className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">No restaurants found</span>
                      <span className="text-xs text-muted-foreground">
                        No results for "{debouncedQuery}"
                      </span>
                    </div>
                  )}
                </>
              )}

              {debouncedQuery.length >= 2 && (
                <div className="border-t pt-3 mt-3">
                  {onCreateNewRestaurant && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCreateNew}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add "{debouncedQuery}" as new restaurant
                    </Button>
                  )}
                </div>
              )}
            </div>

            {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
              <div className="text-center py-4">
                <span className="text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}