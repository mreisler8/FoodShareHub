import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverByLocation() {
  const [location, setLocation] = useState<string>("");
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const { toast } = useToast();

  // Query for popular lists by location
  const {
    data: popularLists,
    isLoading: isPopularLoading,
    error: popularError,
  } = useQuery({
    queryKey: ["/api/restaurant-lists/popular", activeLocation],
    queryFn: async () => {
      if (!activeLocation) return [];
      const res = await fetch(`/api/restaurant-lists/popular/${encodeURIComponent(activeLocation)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch popular lists");
      }
      return res.json();
    },
    enabled: !!activeLocation,
  });

  // Query for restaurants by location
  const {
    data: restaurants,
    isLoading: isRestaurantsLoading,
    error: restaurantsError,
  } = useQuery({
    queryKey: ["/api/restaurants/location", activeLocation],
    queryFn: async () => {
      if (!activeLocation) return [];
      const res = await fetch(`/api/restaurants/location/${encodeURIComponent(activeLocation)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch restaurants");
      }
      return res.json();
    },
    enabled: !!activeLocation,
  });

  const handleSearch = () => {
    if (!location.trim()) {
      toast({
        title: "Please enter a location",
        variant: "destructive",
      });
      return;
    }
    setActiveLocation(location);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Discover by Location</h1>
      <div className="flex gap-2 mb-8">
        <Input
          placeholder="Enter location (e.g. New York City, Chicago)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {activeLocation && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Popular Lists in {activeLocation}
          </h2>
          
          {isPopularLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-64">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full mb-2" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-8 w-24" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : popularError ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-md mb-6">
              Error loading popular lists: {popularError.message}
            </div>
          ) : popularLists && popularLists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularLists.map((list: any) => (
                <Card key={list.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{list.name}</CardTitle>
                    <CardDescription>
                      {list.description || "No description available"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {list.tags && list.tags.map((tag: any, i: number) => (
                        <span key={i} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="outline">
                      <Link to={`/lists/${list.id}`}>View List</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-md mb-6">
              No lists found for {activeLocation}.
            </div>
          )}
        </div>
      )}

      {activeLocation && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Restaurants in {activeLocation}
          </h2>
          
          {isRestaurantsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : restaurantsError ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-md">
              Error loading restaurants: {restaurantsError.message}
            </div>
          ) : restaurants && restaurants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant: any) => (
                <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{restaurant.name}</CardTitle>
                    <CardDescription>{restaurant.category} • {restaurant.priceRange}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {restaurant.location}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-md">
              No restaurants found for {activeLocation}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}