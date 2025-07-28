import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RestaurantSearchComponent } from "@/components/shared/RestaurantSearchComponent";
import { ListItemForm } from "@/components/ListItemForm";

interface RestaurantSearchProps {
  listId: number;
  onRestaurantAdded?: (data: {
    restaurantId: string;
    restaurantName: string;
    rating: number;
    liked: string;
    disliked: string;
    notes: string;
  }) => void;
  onAddCompleted?: () => void;
}

function RestaurantSearch({ listId, onRestaurantAdded, onAddCompleted }: RestaurantSearchProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Handle restaurant selection from our unified search component
  const handleRestaurantSelect = (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setShowAddForm(true);
  };

  // Handle adding restaurant to list
  const addToListMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; rating: number; liked: string; disliked: string; notes: string }) => {
      return apiRequest(`/api/lists/${listId}/restaurants`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response, variables) => {
      toast({
        title: "Restaurant added!",
        description: `${selectedRestaurant?.name} has been added to your list`,
      });
      
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}`] });
      
      // Call parent callbacks
      if (onRestaurantAdded) {
        onRestaurantAdded({
          restaurantId: variables.restaurantId,
          restaurantName: selectedRestaurant?.name || '',
          rating: variables.rating,
          liked: variables.liked,
          disliked: variables.disliked,
          notes: variables.notes,
        });
      }
      
      // Reset form
      setSelectedRestaurant(null);
      setShowAddForm(false);
      setIsAdding(false);
      
      if (onAddCompleted) {
        onAddCompleted();
      }
    },
    onError: (error) => {
      console.error('Error adding restaurant to list:', error);
      toast({
        title: "Error",
        description: "Failed to add restaurant to list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: { rating: number; liked: string; disliked: string; notes: string }) => {
    if (!selectedRestaurant) return;
    
    setIsAdding(true);
    
    const submitData = {
      restaurantId: selectedRestaurant.id?.toString() || selectedRestaurant.googlePlaceId || '',
      rating: data.rating,
      liked: data.liked,
      disliked: data.disliked,
      notes: data.notes,
    };
    
    addToListMutation.mutate(submitData);
  };

  const handleCancel = () => {
    setSelectedRestaurant(null);
    setShowAddForm(false);
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {!showAddForm ? (
        <RestaurantSearchComponent
          onSelect={handleRestaurantSelect}
          placeholder="Search for restaurants to add..."
          className="w-full"
          showLocationServices={true}
          autoRequestLocation={true}
        />
      ) : (
        <ListItemForm
          restaurant={selectedRestaurant}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isAdding}
        />
      )}
    </div>
  );
}

export default RestaurantSearch;
export { RestaurantSearch };