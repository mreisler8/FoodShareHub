import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Restaurant } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, PlusCircle, MapPin, Store, Phone, Clock } from "lucide-react";
import { debounce } from "@/lib/utils";

interface RestaurantSearchProps {
  onSelectRestaurant: (restaurant: Restaurant) => void;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Set up debounced search
  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    handler();
    return () => handler.cancel();
  }, [searchQuery]);
  
  // Fetch restaurant search results
  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: [`/api/restaurants${debouncedQuery ? `?query=${debouncedQuery}` : ""}`],
    enabled: isOpen && debouncedQuery.length > 2,
  });
  
  // Handle restaurant selection
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    onSelectRestaurant(restaurant);
    setIsOpen(false);
    setSearchQuery("");
  };
  
  // Handle create new restaurant button click
  const handleCreateNew = () => {
    if (onCreateNewRestaurant) {
      onCreateNewRestaurant();
    }
    setIsOpen(false);
    setSearchQuery("");
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-left font-normal"
      >
        <Search className="mr-2 h-4 w-4" />
        {placeholder}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Find a Restaurant</DialogTitle>
            <DialogDescription>
              Search for existing restaurants or add a new one if it's not listed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-500" />
              <Input
                type="text"
                placeholder="Search by name, location, or cuisine..."
                className="pl-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="overflow-y-auto max-h-[300px]">
              {/* Loading state */}
              {isLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border p-2">
                      <CardContent className="p-2">
                        <div className="flex flex-col space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* No results state */}
              {!isLoading && debouncedQuery.length > 2 && (!restaurants || restaurants.length === 0) && (
                <div className="text-center py-4 space-y-4">
                  <p className="text-neutral-500">No restaurants found matching "{debouncedQuery}"</p>
                  {onCreateNewRestaurant && (
                    <Button onClick={handleCreateNew} className="mt-2">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Restaurant
                    </Button>
                  )}
                </div>
              )}
              
              {/* Start typing prompt */}
              {!isLoading && debouncedQuery.length < 3 && (
                <div className="text-center py-4">
                  <p className="text-neutral-500">
                    Type at least 3 characters to start searching...
                  </p>
                </div>
              )}
              
              {/* Results */}
              {!isLoading && restaurants && restaurants.length > 0 && (
                <div className="space-y-2">
                  {restaurants.map((restaurant) => (
                    <Card 
                      key={restaurant.id} 
                      className="border p-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                      onClick={() => handleSelectRestaurant(restaurant)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{restaurant.name}</h3>
                          <div className="flex items-center text-sm text-neutral-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>{restaurant.location}</span>
                          </div>
                          <div className="flex gap-x-3 mt-2 text-xs text-neutral-600">
                            <span className="flex items-center">
                              <Store className="h-3 w-3 mr-1" />
                              {restaurant.category}
                            </span>
                            <span>{restaurant.priceRange}</span>
                            {restaurant.phone && (
                              <span className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {restaurant.phone}
                              </span>
                            )}
                          </div>
                          {restaurant.openTableId && (
                            <div className="mt-1 text-xs text-primary">
                              Available on OpenTable
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRestaurant(restaurant);
                          }}
                        >
                          {buttonLabel}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <div className="text-xs text-neutral-500">
              {!onCreateNewRestaurant ? (
                <span>All restaurants are verified for consistency.</span>
              ) : (
                <span>Please search thoroughly before adding a new restaurant.</span>
              )}
            </div>
            {onCreateNewRestaurant && restaurants && restaurants.length > 0 && (
              <Button variant="outline" onClick={handleCreateNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Restaurant
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}