import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Restaurant } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Search, MapPin, Utensils, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function QuickAddRestaurant() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"search" | "add-restaurant" | "add-dishes">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [dishInput, setDishInput] = useState("");
  const [dishes, setDishes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  
  // New restaurant form
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantLocation, setNewRestaurantLocation] = useState("");
  const [newRestaurantCategory, setNewRestaurantCategory] = useState("");
  const [newRestaurantPriceRange, setNewRestaurantPriceRange] = useState("$$");
  
  const { toast } = useToast();
  const currentUser = useCurrentUser();
  
  // Search restaurants query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/restaurants", searchQuery],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/restaurants?query=${encodeURIComponent(searchQuery)}`);
      return res.json();
    },
    enabled: searchQuery.length > 2 && step === "search",
  });
  
  // Create restaurant mutation
  const createRestaurantMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/restaurants", data);
      return res.json();
    },
    onSuccess: (newRestaurant) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setSelectedRestaurant(newRestaurant);
      setStep("add-dishes");
      toast({
        title: "Restaurant added!",
        description: `${newRestaurant.name} has been added to the database.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add restaurant",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });
  
  // Quick save restaurant mutation (saves to your favorites)
  const quickSaveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/saved-restaurants", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/saved-restaurants"] });
      toast({
        title: "Saved to favorites!",
        description: `Added ${selectedRestaurant?.name} to your favorites.`,
      });
      resetAndClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to save",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Quick post mutation (creates a post about this restaurant)
  const quickPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/posts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Posted!",
        description: `Your post about ${selectedRestaurant?.name} has been shared.`,
      });
      resetAndClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to post",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle search
  const handleSearch = () => {
    if (searchQuery.length > 2) {
      // Search is triggered by the useQuery above
    }
  };
  
  // Handle restaurant selection
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setStep("add-dishes");
  };
  
  // Handle create new restaurant
  const handleCreateNewRestaurant = () => {
    setStep("add-restaurant");
  };
  
  // Submit new restaurant
  const handleSubmitNewRestaurant = () => {
    if (!newRestaurantName || !newRestaurantLocation || !newRestaurantCategory) {
      toast({
        title: "Missing information",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    createRestaurantMutation.mutate({
      name: newRestaurantName,
      location: newRestaurantLocation,
      category: newRestaurantCategory,
      priceRange: newRestaurantPriceRange,
    });
  };
  
  // Add dish to list
  const handleAddDish = () => {
    if (dishInput.trim()) {
      setDishes([...dishes, dishInput.trim()]);
      setDishInput("");
    }
  };
  
  // Remove dish from list
  const handleRemoveDish = (index: number) => {
    setDishes(dishes.filter((_, i) => i !== index));
  };
  
  // Handle quick save to favorites
  const handleQuickSave = () => {
    if (!selectedRestaurant || !currentUser) return;
    
    quickSaveMutation.mutate({
      userId: currentUser.id,
      restaurantId: selectedRestaurant.id,
      notes: notes || null,
      savedAt: new Date(),
    });
  };
  
  // Handle quick post
  const handleQuickPost = () => {
    if (!selectedRestaurant || !currentUser) return;
    
    quickPostMutation.mutate({
      userId: currentUser.id,
      restaurantId: selectedRestaurant.id,
      content: notes || `I enjoyed ${selectedRestaurant.name}!`,
      dishesTried: dishes.length > 0 ? dishes : null,
      images: [],
      rating: 5,
      visibility: "public",
    });
  };
  
  // Reset and close dialog
  const resetAndClose = () => {
    setIsOpen(false);
    setStep("search");
    setSearchQuery("");
    setSelectedRestaurant(null);
    setDishes([]);
    setNotes("");
    setNewRestaurantName("");
    setNewRestaurantLocation("");
    setNewRestaurantCategory("");
    setNewRestaurantPriceRange("$$");
    setDishInput("");
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" onClick={() => setIsOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          <span>Add Restaurant</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === "search" && "Find a Restaurant"}
            {step === "add-restaurant" && "Add New Restaurant"}
            {step === "add-dishes" && `Add Details for ${selectedRestaurant?.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === "search" && "Search for a restaurant or add a new one."}
            {step === "add-restaurant" && "Add details about the restaurant."}
            {step === "add-dishes" && "What dishes did you try? Any notes?"}
          </DialogDescription>
        </DialogHeader>
        
        {step === "search" && (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {isSearching ? (
                <p className="text-sm text-center py-4 text-muted-foreground">Searching...</p>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((restaurant: Restaurant) => (
                  <Card key={restaurant.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleSelectRestaurant(restaurant)}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{restaurant.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" /> {restaurant.location}
                          </p>
                          <p className="text-xs mt-1">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                              <Utensils className="h-3 w-3 inline mr-1" />
                              {restaurant.category}
                            </span>
                            <span className="ml-1 text-muted-foreground">{restaurant.priceRange}</span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : searchQuery.length > 2 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No restaurants found</p>
                  <Button variant="outline" onClick={handleCreateNewRestaurant}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Restaurant
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-center py-4 text-muted-foreground">
                  Type at least 3 characters to search
                </p>
              )}
            </div>
          </div>
        )}
        
        {step === "add-restaurant" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name">Restaurant Name *</Label>
              <Input
                id="restaurant-name"
                placeholder="e.g., Delicious Pizza Place"
                value={newRestaurantName}
                onChange={(e) => setNewRestaurantName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="restaurant-location">Location *</Label>
              <Input
                id="restaurant-location"
                placeholder="e.g., Chelsea, NYC"
                value={newRestaurantLocation}
                onChange={(e) => setNewRestaurantLocation(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="restaurant-category">Category/Cuisine *</Label>
              <Input
                id="restaurant-category"
                placeholder="e.g., Italian, Vegetarian"
                value={newRestaurantCategory}
                onChange={(e) => setNewRestaurantCategory(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="restaurant-price">Price Range</Label>
              <div className="flex space-x-2">
                {["$", "$$", "$$$", "$$$$"].map((price) => (
                  <Button
                    key={price}
                    type="button"
                    variant={newRestaurantPriceRange === price ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setNewRestaurantPriceRange(price)}
                  >
                    {price}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {step === "add-dishes" && selectedRestaurant && (
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Add a dish you tried..."
                value={dishInput}
                onChange={(e) => setDishInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDish()}
              />
              <Button type="button" onClick={handleAddDish}>Add</Button>
            </div>
            
            {dishes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {dishes.map((dish, index) => (
                  <Badge key={index} variant="secondary" className="px-2 py-1 cursor-pointer" onClick={() => handleRemoveDish(index)}>
                    {dish} ×
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="space-y-2 mt-4">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Share your thoughts about this restaurant..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {step === "search" && (
            <Button variant="outline" onClick={handleCreateNewRestaurant}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Restaurant
            </Button>
          )}
          
          {step === "add-restaurant" && (
            <>
              <Button variant="outline" onClick={() => setStep("search")}>Back</Button>
              <Button onClick={handleSubmitNewRestaurant} disabled={createRestaurantMutation.isPending}>
                {createRestaurantMutation.isPending ? "Adding..." : "Add Restaurant"}
              </Button>
            </>
          )}
          
          {step === "add-dishes" && (
            <>
              <Button variant="outline" onClick={() => setStep("search")}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleQuickSave} disabled={quickSaveMutation.isPending}>
                  {quickSaveMutation.isPending ? "Saving..." : "Save to Favorites"}
                </Button>
                <Button onClick={handleQuickPost} disabled={quickPostMutation.isPending}>
                  {quickPostMutation.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}