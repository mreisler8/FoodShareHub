import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Plus, Star, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Search result interface
interface SearchResult {
  id: number;
  name: string;
  cuisine: string;
  location: string;
  imageUrl?: string;
  priceRange: string;
  rating: number;
}

// Add restaurant form schema
const addRestaurantSchema = z.object({
  rating: z.string().min(1, "Rating is required"),
  liked: z.string().optional(),
  disliked: z.string().optional(),
  notes: z.string().optional(),
});

type AddRestaurantFormValues = z.infer<typeof addRestaurantSchema>;

interface RestaurantSearchProps {
  listId: number;
  onRestaurantAdded?: () => void;
}

export function RestaurantSearch({ listId, onRestaurantAdded }: RestaurantSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<SearchResult | null>(null);
  const { toast } = useToast();

  // Debounced search query (only search when query is 2+ characters)
  const shouldSearch = searchQuery.trim().length >= 2;

  // Search restaurants query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", searchQuery.trim()],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<SearchResult[]>;
    },
    enabled: shouldSearch,
    staleTime: 30000, // Cache results for 30 seconds
  });

  // Add restaurant form
  const form = useForm<AddRestaurantFormValues>({
    resolver: zodResolver(addRestaurantSchema),
    defaultValues: {
      rating: "",
      liked: "",
      disliked: "",
      notes: "",
    },
  });

  // Add restaurant to list mutation
  const addToListMutation = useMutation({
    mutationFn: async (values: AddRestaurantFormValues) => {
      if (!selectedRestaurant) throw new Error("No restaurant selected");
      
      const payload = {
        restaurantId: selectedRestaurant.id,
        rating: parseInt(values.rating),
        liked: values.liked || null,
        disliked: values.disliked || null,
        notes: values.notes || null,
      };
      
      return await apiRequest("POST", `/api/lists/${listId}/items`, payload);
    },
    onSuccess: () => {
      // Invalidate list details to refresh items
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}`] });
      
      toast({
        title: "Restaurant added!",
        description: `${selectedRestaurant?.name} has been added to your list.`,
      });
      
      // Reset form and selection
      form.reset();
      setSelectedRestaurant(null);
      setSearchQuery("");
      
      // Call callback if provided
      if (onRestaurantAdded) {
        onRestaurantAdded();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add restaurant to list.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: AddRestaurantFormValues) => {
    addToListMutation.mutate(values);
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search restaurants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {shouldSearch && (
        <div className="space-y-2">
          {isSearching ? (
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((restaurant) => (
                <Card key={restaurant.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {restaurant.imageUrl ? (
                          <img 
                            src={restaurant.imageUrl} 
                            alt={restaurant.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-xs">No img</span>
                          </div>
                        )}
                        
                        <div>
                          <h3 className="font-medium text-gray-900">{restaurant.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{restaurant.cuisine}</span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{restaurant.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex">{renderStars(Math.round(restaurant.rating))}</div>
                            <Badge variant="outline">{restaurant.priceRange}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => setSelectedRestaurant(restaurant)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add to List
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchQuery.trim().length >= 2 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No restaurants found for "{searchQuery}"</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Add Restaurant Form */}
      {selectedRestaurant && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Add {selectedRestaurant.name} to your list</h3>
              <p className="text-sm text-gray-500">Share your experience with this restaurant</p>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Star Rating *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Rate this restaurant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">5 stars - Excellent</SelectItem>
                          <SelectItem value="4">4 stars - Very Good</SelectItem>
                          <SelectItem value="3">3 stars - Good</SelectItem>
                          <SelectItem value="2">2 stars - Fair</SelectItem>
                          <SelectItem value="1">1 star - Poor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="liked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What I liked</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What did you enjoy about this restaurant?"
                          rows={2}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="disliked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What I didn't like</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What could be improved?"
                          rows={2}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any other thoughts or recommendations?"
                          rows={2}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setSelectedRestaurant(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addToListMutation.isPending}
                  >
                    {addToListMutation.isPending ? "Adding..." : "Add to List"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}