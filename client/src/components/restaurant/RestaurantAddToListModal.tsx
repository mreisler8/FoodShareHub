import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Restaurant, InsertRestaurantListItem } from "@shared/schema";
import { RestaurantSearch } from "./RestaurantSearch";
import { RestaurantForm } from "./RestaurantForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Info } from "lucide-react";

interface RestaurantAddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: number;
  userId: number;
}

export function RestaurantAddToListModal({ 
  isOpen, 
  onClose, 
  listId,
  userId
}: RestaurantAddToListModalProps) {
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showAddRestaurantForm, setShowAddRestaurantForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [mustTryDishes, setMustTryDishes] = useState("");

  // Fetch the list details to show in the modal
  const { data: list } = useQuery({
    queryKey: [`/api/restaurant-lists/${listId}`],
    enabled: isOpen,
  });
  
  // Add restaurant to list mutation
  const addToListMutation = useMutation({
    mutationFn: async (data: InsertRestaurantListItem) => {
      return await apiRequest("POST", "/api/restaurant-list-items", data);
    },
    onSuccess: () => {
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant-lists/${listId}`] });
      
      toast({
        title: "Restaurant added to list",
        description: `${selectedRestaurant?.name} has been added to ${list?.name}`,
      });
      
      // Reset state and close modal
      setSelectedRestaurant(null);
      setNotes("");
      setMustTryDishes("");
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error adding restaurant to list",
        description: "There was a problem adding the restaurant to your list",
        variant: "destructive"
      });
    }
  });
  
  // Handle restaurant selection
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };
  
  // Handle restaurant creation
  const handleCreateRestaurant = () => {
    setShowAddRestaurantForm(true);
  };
  
  // Handle successful restaurant creation
  const handleRestaurantCreated = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowAddRestaurantForm(false);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRestaurant) {
      toast({
        title: "Restaurant required",
        description: "Please select a restaurant to add to your list",
        variant: "destructive"
      });
      return;
    }
    
    // Prepare the must-try dishes array
    const dishesList = mustTryDishes
      .split(",")
      .map(dish => dish.trim())
      .filter(dish => dish.length > 0);
    
    // Create the list item data
    const data: InsertRestaurantListItem = {
      listId,
      restaurantId: selectedRestaurant.id,
      notes: notes.trim() || undefined,
      mustTryDishes: dishesList.length > 0 ? dishesList : undefined,
      addedById: userId,
      position: 0 // This will be calculated on the server
    };
    
    addToListMutation.mutate(data);
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Restaurant to List</DialogTitle>
            <DialogDescription>
              {list?.name ? `Add a restaurant to "${list.name}"` : "Add a restaurant to your list"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {!selectedRestaurant ? (
              <div className="space-y-2">
                <Label htmlFor="restaurant">Restaurant</Label>
                <RestaurantSearch 
                  onSelectRestaurant={handleSelectRestaurant}
                  onCreateNewRestaurant={handleCreateRestaurant}
                  buttonLabel="Select"
                  placeholder="Search for a restaurant to add"
                />
                <p className="text-xs text-neutral-500">
                  <Info className="h-3 w-3 inline-block mr-1" />
                  Search for existing restaurants first to avoid duplicates
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Selected Restaurant</Label>
                <div className="flex items-center justify-between p-3 border rounded-md bg-neutral-50">
                  <div>
                    <div className="font-medium">{selectedRestaurant.name}</div>
                    <div className="text-sm text-neutral-500">
                      {selectedRestaurant.category} • {selectedRestaurant.location}
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedRestaurant(null)}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
            
            {selectedRestaurant && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="notes">Your Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any personal notes about this restaurant"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mustTryDishes">Must-Try Dishes (Optional)</Label>
                  <Input
                    id="mustTryDishes"
                    placeholder="Separate dishes with commas, e.g. Truffle Pasta, Tiramisu"
                    value={mustTryDishes}
                    onChange={(e) => setMustTryDishes(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={addToListMutation.isPending}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit"
                disabled={!selectedRestaurant || addToListMutation.isPending}
              >
                {addToListMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add to List
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {showAddRestaurantForm && (
        <RestaurantForm
          isOpen={showAddRestaurantForm}
          onClose={() => setShowAddRestaurantForm(false)}
          onSuccess={handleRestaurantCreated}
        />
      )}
    </>
  );
}