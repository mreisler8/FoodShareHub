
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RestaurantSearch } from '@/components/restaurant/RestaurantSearch';
import { VisibilitySelector } from '@/components/VisibilitySelector';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, X, MapPin, Star, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  category?: string;
  priceRange?: string;
  source?: 'database' | 'google';
  googlePlaceId?: string;
}

interface ListItem {
  id: string;
  restaurant: Restaurant;
  notes?: string;
  rank: number;
}

interface ListOfSpotsFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function ListOfSpotsForm({ onSubmit, onCancel }: ListOfSpotsFormProps) {
  const { toast } = useToast();
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [showRestaurantSearch, setShowRestaurantSearch] = useState(false);
  const [visibilitySettings, setVisibilitySettings] = useState({
    public: true,
    followers: false,
    circleIds: [] as number[]
  });

  const createListMutation = useMutation({
    mutationFn: async (listData: any) => {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listData),
      });
      if (!response.ok) throw new Error('Failed to create list');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'List created successfully!',
        description: `"${listName}" has been created and shared.`,
      });
      onSubmit(data);
    },
    onError: (error) => {
      toast({
        title: 'Error creating list',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddRestaurant = (restaurant: Restaurant) => {
    const newItem: ListItem = {
      id: `${restaurant.id}-${Date.now()}`,
      restaurant,
      notes: '',
      rank: listItems.length + 1,
    };
    setListItems([...listItems, newItem]);
    setShowRestaurantSearch(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setListItems(listItems.filter(item => item.id !== itemId));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(listItems);
    const [reorderedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, reorderedItem);

    // Update ranks
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    setListItems(updatedItems);
  };

  const handleSubmit = () => {
    if (!listName.trim()) {
      toast({
        title: 'List name required',
        description: 'Please enter a name for your list.',
        variant: 'destructive',
      });
      return;
    }

    if (listItems.length === 0) {
      toast({
        title: 'Add some restaurants',
        description: 'Please add at least one restaurant to your list.',
        variant: 'destructive',
      });
      return;
    }

    const listData = {
      name: listName,
      description,
      type: 'restaurant',
      visibility: visibilitySettings,
      items: listItems.map(item => ({
        restaurantId: item.restaurant.source === 'database' ? parseInt(item.restaurant.id) : null,
        googlePlaceId: item.restaurant.source === 'google' ? item.restaurant.googlePlaceId : null,
        name: item.restaurant.name,
        notes: item.notes,
        rank: item.rank,
      })),
    };

    createListMutation.mutate(listData);
  };

  return (
    <div className="space-y-6">
      {/* List Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Star className="h-5 w-5 text-blue-600" />
            </div>
            List Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="listName">List Name *</Label>
            <Input
              id="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., Best Pizza in NYC, Weekend Brunch Spots"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what makes this list special..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Restaurant List */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurants ({listItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {listItems.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No restaurants added yet</p>
              <Button onClick={() => setShowRestaurantSearch(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Restaurant
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="restaurant-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {listItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-4 border rounded-lg mb-2 bg-white ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <GripVertical className="h-5 w-5" />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-medium text-sm text-gray-500 mr-2">
                                        #{item.rank}
                                      </span>
                                      <span className="font-medium">
                                        {item.restaurant.name}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveItem(item.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  <div className="text-sm text-gray-600 mt-1">
                                    {item.restaurant.location} • {item.restaurant.category}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              <Button 
                variant="outline" 
                onClick={() => setShowRestaurantSearch(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Restaurant
              </Button>
            </div>
          )}

          {showRestaurantSearch && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <RestaurantSearch
                onSelectRestaurant={handleAddRestaurant}
                placeholder="Search restaurants to add to your list..."
                buttonLabel="Search restaurants"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRestaurantSearch(false)}
                className="mt-2"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Share Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <VisibilitySelector
            value={visibilitySettings}
            onChange={setVisibilitySettings}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="flex-1"
          disabled={createListMutation.isPending}
        >
          {createListMutation.isPending ? 'Creating...' : 'Create List'}
        </Button>
      </div>
    </div>
  );
}
