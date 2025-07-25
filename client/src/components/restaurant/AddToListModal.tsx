import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: {
    id?: number;
    googlePlaceId?: string;
    name: string;
    location?: string;
    address?: string;
  };
}

interface RestaurantList {
  id: number;
  name: string;
  description?: string;
  itemCount: number;
  isPublic: boolean;
  createdAt: string;
  isOwner: boolean;
}

export default function AddToListModal({ isOpen, onClose, restaurant }: AddToListModalProps) {
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's lists
  const { data: lists = [], isLoading } = useQuery<RestaurantList[]>({
    queryKey: ['/api/lists'],
    enabled: isOpen
  });

  const addToListMutation = useMutation({
    mutationFn: async (listIds: number[]) => {
      // Add restaurant to each selected list using correct API format
      const promises = listIds.map(async (listId) => {
        const restaurantData = {
          name: restaurant.name,
          location: restaurant.location || restaurant.address,
          googlePlaceId: restaurant.googlePlaceId,
          notes: `Added from restaurant page`,
          position: 0 // Server will calculate actual position
        };
        
        return apiRequest('POST', `/api/lists/${listId}/restaurants`, restaurantData);
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      toast({
        title: "Added to lists",
        description: `${restaurant.name} added to ${selectedLists.length} list${selectedLists.length > 1 ? 's' : ''}`
      });
      onClose();
    },
    onError: (error) => {
      console.error('Add to list error:', error);
      toast({
        title: "Failed to add to lists",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleToggleList = (listId: number) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const handleAddToLists = () => {
    if (selectedLists.length === 0) {
      toast({
        title: "No lists selected",
        description: "Please select at least one list",
        variant: "destructive"
      });
      return;
    }
    
    addToListMutation.mutate(selectedLists);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Lists</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Restaurant Info */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
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

          {/* Lists Selection */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Select Lists</h4>
            
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !Array.isArray(lists) || lists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No lists yet</p>
                <p className="text-sm">Create your first list to get started</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {Array.isArray(lists) && lists.map((list: RestaurantList) => (
                  <Card
                    key={list.id}
                    className={`cursor-pointer transition-colors ${
                      selectedLists.includes(list.id) 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleList(list.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-sm truncate">{list.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {list.itemCount} items
                            </Badge>
                          </div>
                          {list.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {list.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-2">
                          {selectedLists.includes(list.id) ? (
                            <Check className="h-5 w-5 text-orange-600" />
                          ) : (
                            <Plus className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleAddToLists}
              disabled={selectedLists.length === 0 || addToListMutation.isPending}
              className="flex-1"
            >
              {addToListMutation.isPending ? 'Adding...' : `Add to ${selectedLists.length} list${selectedLists.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}