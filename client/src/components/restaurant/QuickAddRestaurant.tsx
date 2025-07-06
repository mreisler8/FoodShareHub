import { useState, useEffect } from "react";
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
  const [userLocation, setUserLocation] = useState<string>("");
  const [popularNearby, setPopularNearby] = useState<string[]>([
    "Italian restaurants",
    "Best coffee shops",
    "Sushi places"
  ]);
  
  // New restaurant form
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantLocation, setNewRestaurantLocation] = useState("");
  const [newRestaurantCategory, setNewRestaurantCategory] = useState("");
  const [newRestaurantPriceRange, setNewRestaurantPriceRange] = useState("$$");
  
  const { toast } = useToast();
  const currentUser = useCurrentUser();
  
  // Get user's location when the component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // For now, just use coordinates to determine general area
          // In production, you'd use a geocoding service
          const { latitude, longitude } = position.coords;
          
          // Simple logic to determine general area based on coordinates
          if (latitude > 40.5 && latitude < 40.9 && longitude > -74.1 && longitude < -73.7) {
            setUserLocation("New York City");
            setPopularNearby(["NYC Pizza spots", "Manhattan sushi", "Brooklyn coffee shops"]);
          } else if (latitude > 37.6 && latitude < 37.9 && longitude > -122.6 && longitude < -122.3) {
            setUserLocation("San Francisco");
            setPopularNearby(["SF food trucks", "Mission tacos", "Chinatown dim sum"]);
          } else if (latitude > 43.5 && latitude < 43.9 && longitude > -79.5 && longitude < -79.1) {
            setUserLocation("Toronto, ON");
            setPopularNearby(["Best poutine spots", "Top Tim Hortons", "Local food trucks"]);
          } else {
            setUserLocation("Your Area");
            setPopularNearby(["Italian restaurants", "Best coffee shops", "Sushi places"]);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fall back to a default location
          setUserLocation("New York City");
          setPopularNearby(["Italian restaurants", "Best coffee shops", "Sushi places"]);
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      );
    } else {
      // Geolocation not supported
      setUserLocation("New York City");
      setPopularNearby(["Italian restaurants", "Best coffee shops", "Sushi places"]);
    }
  }, []);
  
  // Mock function to simulate fetching location name
  // In a real app, you'd use a geocoding API
  const fetchLocationName = (latitude: number, longitude: number) => {
    // Simulate API call
    setTimeout(() => {
      // This would normally come from an API
      setUserLocation("New York City");
      
      // Update popular nearby suggestions based on location
      setPopularNearby([
        "NYC Pizza spots",
        "Manhattan sushi",
        "Brooklyn coffee shops"
      ]);
    }, 500);
  };
  
  // Search restaurants query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: [`/api/restaurants?query=${encodeURIComponent(searchQuery)}`],
    queryFn: async () => {
      console.log("Searching for:", searchQuery);
      const res = await apiRequest("GET", `/api/restaurants?query=${encodeURIComponent(searchQuery)}`);
      const results = await res.json();
      console.log("Search results:", results);
      return results;
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
      console.log("Manually triggering search for:", searchQuery);
      // Force refresh the query - first disable and then enable it again to trigger a fresh fetch
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants?query=${encodeURIComponent(searchQuery)}`] });
      // This button click will force the query component to refetch data
      document.getElementById("search-button")?.click();
    }
  };
  
  // Save Google Place to database mutation
  const saveGooglePlaceMutation = useMutation({
    mutationFn: async (placeId: string) => {
      console.log("Saving Google Place to database:", placeId);
      const res = await apiRequest("POST", "/api/google/places/save", { placeId });
      return res.json();
    },
    onSuccess: (restaurant) => {
      setSelectedRestaurant(restaurant);
      setStep("add-dishes");
      toast({
        title: "Restaurant added!",
        description: `${restaurant.name} has been added to our database.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add restaurant",
        description: "Error saving Google Place to database.",
        variant: "destructive",
      });
    },
  });

  // Handle restaurant selection
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    // If it's a Google Place that hasn't been saved to our database yet
    if (restaurant.googlePlaceId && !restaurant.id) {
      console.log("Selected Google Place:", restaurant);
      saveGooglePlaceMutation.mutate(restaurant.googlePlaceId);
    } else {
      // Regular restaurant or already saved Google Place
      setSelectedRestaurant(restaurant);
      setStep("add-dishes");
    }
  };
  
  // Handle create new restaurant
  const handleCreateNewRestaurant = () => {
    // Pre-fill location with user location if available
    if (userLocation) {
      setNewRestaurantLocation(userLocation);
    }
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
      
      <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
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
                  autoFocus
                  autoComplete="off"
                />
              </div>
              <Button id="search-button" onClick={() => {
                // Re-fetch the data when button is clicked
                if (searchQuery.length > 2) {
                  const queryKey = `/api/restaurants?query=${encodeURIComponent(searchQuery)}`;
                  queryClient.fetchQuery({ queryKey: [queryKey] });
                }
              }} className="hidden">Search</Button>
            </div>
            
            {/* Location-based suggestions */}
            {!searchQuery && !selectedRestaurant && (
  <div className="text-sm text-muted-foreground mb-4">
    <p className="font-medium text-foreground mb-2">Quick Tips:</p>
    <ul className="list-disc pl-4 space-y-1">
      <li>Share recent restaurants you loved</li>
      <li>Add must-try dishes to help friends</li>
      <li>Include price range and ambiance notes</li>
    </ul>
  </div>
)}

{!searchQuery && (
              <div className="flex flex-col space-y-1 text-sm text-muted-foreground px-2">
                <p className="font-medium text-foreground">Popular in {userLocation || "your area"}:</p>
                {popularNearby.map((suggestion, index) => (
                  <button 
                    key={index}
                    className="text-left text-primary hover:underline py-0.5 flex items-center" 
                    onClick={() => {
                      setSearchQuery(suggestion);
                      // Trigger search after setting the query
                      setTimeout(() => handleSearch(), 100);
                    }}
                  >
                    <MapPin className="h-3 w-3 mr-1 inline" /> {suggestion}
                  </button>
                ))}
                {userLocation && (
                  <button 
                    className="text-left text-primary hover:underline py-0.5 flex items-center mt-2" 
                    onClick={() => {
                      setSearchQuery(userLocation);
                      // Trigger search after setting the query
                      setTimeout(() => handleSearch(), 100);
                    }}
                  >
                    <MapPin className="h-3 w-3 mr-1 inline" /> All restaurants in {userLocation}
                  </button>
                )}
              </div>
            )}
            
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {isSearching ? (
                <p className="text-sm text-center py-4 text-muted-foreground">Searching...</p>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((restaurant: Restaurant) => (
                  <Card 
                    key={restaurant.id || restaurant.googlePlaceId} 
                    className="cursor-pointer hover:bg-accent/50" 
                    onClick={() => handleSelectRestaurant(restaurant)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {restaurant.name}
                            {restaurant.googlePlaceId && !restaurant.id && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                Google
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" /> {restaurant.location || restaurant.address}
                          </p>
                          <p className="text-xs mt-1">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                              <Utensils className="h-3 w-3 inline mr-1" />
                              {restaurant.category || restaurant.cuisine || "Restaurant"}
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