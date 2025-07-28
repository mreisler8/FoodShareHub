import React, { useState } from 'react';
import { Bookmark, Heart, Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SaveRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: {
    id?: number;
    googlePlaceId?: string;
    name: string;
    location?: string;
    address?: string;
  };
  isSaved?: boolean;
}

export default function SaveRestaurantModal({ 
  isOpen, 
  onClose, 
  restaurant, 
  isSaved = false 
}: SaveRestaurantModalProps) {
  const [addToFavorites, setAddToFavorites] = useState(false);
  const [addToWishlist, setAddToWishlist] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveRestaurantMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        // Unsave restaurant
        return apiRequest(`/api/restaurants/${restaurant.googlePlaceId || restaurant.id}/save`, {
          method: 'DELETE',
        });
      } else {
        // Save restaurant
        return apiRequest('/api/restaurants/saved', {
          method: 'POST',
          body: JSON.stringify({
            restaurantId: restaurant.id,
            googlePlaceId: restaurant.googlePlaceId,
            name: restaurant.name,
            location: restaurant.location,
            addToFavorites,
            addToWishlist,
          }),
          headers: { 'Content-Type': 'application/json' }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants/saved'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      
      if (isSaved) {
        toast({
          title: "Removed from saved",
          description: `${restaurant.name} removed from your saved restaurants`
        });
      } else {
        toast({
          title: "Saved to your profile",
          description: `${restaurant.name} saved${addToFavorites ? ' to favorites' : ''}${addToWishlist ? ' to wishlist' : ''}`
        });
      }
      onClose();
    },
    onError: (error) => {
      console.error('Save restaurant error:', error);
      toast({
        title: "Failed to save restaurant",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    saveRestaurantMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>
            {isSaved ? 'Remove from Saved' : 'Save Restaurant'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Restaurant Info */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  🍽️
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{restaurant.name}</h3>
                  {restaurant.location && (
                    <p className="text-sm text-muted-foreground truncate">
                      {restaurant.location}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {!isSaved && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Save Options</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Heart className="h-5 w-5 text-red-500" />
                    <div>
                      <Label htmlFor="favorites" className="font-medium">
                        Add to Favorites
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Mark as one of your favorite restaurants
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="favorites"
                    checked={addToFavorites}
                    onCheckedChange={setAddToFavorites}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <div>
                      <Label htmlFor="wishlist" className="font-medium">
                        Add to Wishlist
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Save for future visits
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="wishlist"
                    checked={addToWishlist}
                    onCheckedChange={setAddToWishlist}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveRestaurantMutation.isPending}
              variant={isSaved ? "destructive" : "default"}
              className="flex-1"
            >
              {saveRestaurantMutation.isPending ? 
                (isSaved ? 'Removing...' : 'Saving...') : 
                (isSaved ? 'Remove from Saved' : 'Save Restaurant')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}