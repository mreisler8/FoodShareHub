import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Plus, Check, UtensilsCrossed, Star } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";

interface Restaurant {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  priceLevel?: number;
  photos?: string[];
  googlePlaceId?: string;
  location?: string;
}

interface AddListItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: { id: string; name: string } | null;
  onAddSuccess?: () => void;
}

const AddListItemModal: React.FC<AddListItemModalProps> = ({
  isOpen,
  onClose,
  list,
  onAddSuccess
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the search hook
  const { 
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading: isSearching
  } = useSearch({
    searchType: 'restaurants',
    enabled: isOpen,
    minQueryLength: 2
  });

  const restaurants = searchResults?.restaurants || [];

  const handleAddRestaurant = async (restaurant: Restaurant) => {
    if (!list) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/lists/${list.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'restaurant',
          restaurantId: restaurant.id,
          googlePlaceId: restaurant.googlePlaceId,
          notes: '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add restaurant to list');
      }

      setShowSuccess(true);
      onAddSuccess?.();
      
      // Close modal after showing success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Error adding restaurant to list:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowSuccess(false);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-white border shadow-lg">
        <DialogHeader className="px-4 py-3 border-b bg-white">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Add Restaurant
          </DialogTitle>
        </DialogHeader>

        {showSuccess && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Added!</h3>
                <p className="text-sm text-green-600">
                  Added to "{list?.name || 'List'}"
                </p>
              </div>
            </div>
          </div>
        )}

        {!showSuccess && (
          <div className="p-4 space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            )}

            {!isSearching && restaurants && restaurants.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {restaurants.map((restaurant: Restaurant) => (
                  <div key={restaurant.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 flex-shrink-0">
                        {restaurant.photos && restaurant.photos.length > 0 ? (
                          <img 
                            src={restaurant.photos[0]} 
                            alt={restaurant.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full ${restaurant.photos && restaurant.photos.length > 0 ? 'hidden' : ''} bg-gray-100 rounded-lg flex items-center justify-center`}>
                          <UtensilsCrossed className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {restaurant.name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {restaurant.category && (
                            <span>{restaurant.category}</span>
                          )}
                          {restaurant.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{restaurant.rating.toFixed(1)}</span>
                            </div>
                          )}
                          {restaurant.priceLevel && (
                            <span className="text-green-600">
                              {'$'.repeat(restaurant.priceLevel)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAddRestaurant(restaurant)}
                      className="ml-3 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                      disabled={isSubmitting}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchQuery && restaurants && restaurants.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">No restaurants found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  No results for "{searchQuery}"
                </p>
              </div>
            )}

            {!searchQuery && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Search for restaurants</h3>
                <p className="text-sm text-gray-500">
                  Start typing to find restaurants to add to your list
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddListItemModal;