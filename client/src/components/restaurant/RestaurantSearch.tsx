import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchResultsList } from '@/components/search/SearchResultsList';
import { SearchResult } from '@/services/searchService';

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
  
  const {
    searchQuery,
    setSearchQuery,
    results,
    isLoading,
    error,
    inputRef,
    locationPermission,
    requestLocation,
    recordSearch
  } = useSearch({
    searchType: 'restaurants',
    enabled: isOpen,
    autoFocus: true,
    includeLocation: true,
    includeTrending: false,
    includeRecentSearches: false
  });

  // Handle restaurant selection
  const handleSelectRestaurant = (result: SearchResult) => {
    // Convert SearchResult to RestaurantSearchResult format
    const restaurant: RestaurantSearchResult = {
      id: result.id,
      name: result.name,
      location: result.location,
      category: result.cuisine,
      priceRange: result.priceRange,
      cuisine: result.cuisine,
      address: result.address,
      thumbnailUrl: result.thumbnailUrl,
      avgRating: result.avgRating,
      source: result.source,
      googlePlaceId: result.googlePlaceId
    };
    
    onSelectRestaurant(restaurant);
    setIsOpen(false);
    setSearchQuery("");
    recordSearch(result.name);
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
            <SearchInput
              inputRef={inputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={placeholder}
              isLoading={isLoading}
              locationPermission={locationPermission}
              onLocationRequest={requestLocation}
              showLocationButton={true}
            />

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              <SearchResultsList
                results={Array.isArray(results) ? results : []}
                isLoading={isLoading}
                error={error}
                emptyMessage="No restaurants found"
                onResultClick={handleSelectRestaurant}
              />

              {/* Create New Restaurant Option */}
              {onCreateNewRestaurant && searchQuery.length >= 2 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={handleCreateNew}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add "{searchQuery}" as new restaurant
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}