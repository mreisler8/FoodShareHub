import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { RestaurantSearchComponent } from '@/components/shared/RestaurantSearchComponent';

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

  // Handle restaurant selection from unified search
  const handleSelectRestaurant = (restaurant: any) => {
    // Convert to RestaurantSearchResult format
    const convertedRestaurant: RestaurantSearchResult = {
      id: restaurant.id,
      name: restaurant.name,
      location: restaurant.location,
      category: restaurant.category || restaurant.cuisine,
      priceRange: restaurant.priceRange,
      cuisine: restaurant.cuisine || restaurant.category,
      address: restaurant.address,
      thumbnailUrl: restaurant.imageUrl,
      avgRating: restaurant.averageRating,
      source: restaurant.source,
      googlePlaceId: restaurant.googlePlaceId
    };
    
    onSelectRestaurant(convertedRestaurant);
    setIsOpen(false);
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
            <RestaurantSearchComponent
              onSelect={handleSelectRestaurant}
              placeholder={placeholder}
              className="w-full"
              showLocationServices={true}
              autoRequestLocation={true}
            />

            {/* Create New Restaurant Option */}
            {onCreateNewRestaurant && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    if (onCreateNewRestaurant) {
                      onCreateNewRestaurant();
                      setIsOpen(false);
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new restaurant
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}