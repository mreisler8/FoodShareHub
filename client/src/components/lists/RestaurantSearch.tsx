import { useState, useEffect, useRef, useCallback } from "react";
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

// Updated search result interface to match new API
interface SearchResult {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  avgRating: number;
  location?: string;
  source: 'database' | 'google';
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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<SearchResult | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setHighlightedIndex(-1); // Reset highlight when query changes
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update dropdown visibility
  useEffect(() => {
    setShowDropdown(debouncedQuery.trim().length >= 2);
  }, [debouncedQuery]);

  // Debounced search query (only search when query is 2+ characters)
  const shouldSearch = debouncedQuery.trim().length >= 2;

  // Search restaurants query with debounced input
  const { data: allSearchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", debouncedQuery.trim()],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<SearchResult[]>;
    },
    enabled: shouldSearch,
    staleTime: 30000, // Cache results for 30 seconds
  });

  // Limit results to 5 maximum as per user story
  const searchResults = allSearchResults ? allSearchResults.slice(0, 5) : [];

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || !searchResults.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          const selectedResult = searchResults[highlightedIndex];
          setSelectedRestaurant(selectedResult);
          setShowDropdown(false);
          setSearchQuery("");
          setDebouncedQuery("");
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showDropdown, searchResults, highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      
      // Handle both database and Google Places results
      let restaurantId: number;
      
      if (selectedRestaurant.source === 'database') {
        restaurantId = parseInt(selectedRestaurant.id);
      } else {
        // For Google Places results, we need to create a restaurant first
        const newRestaurant = await apiRequest("POST", "/api/restaurants", {
          name: selectedRestaurant.name,
          location: selectedRestaurant.location || "Unknown location",
          category: "Restaurant",
          priceRange: "$$",
          cuisine: "Restaurant",
          imageUrl: selectedRestaurant.thumbnailUrl,
          googlePlaceId: selectedRestaurant.id.replace('google_', ''),
        });
        restaurantId = newRestaurant.id;
      }
      
      const payload = {
        restaurantId: restaurantId,
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

  const formatRating = (rating: number) => {
    return `★ ${rating.toFixed(1)}`;
  };

  return (
    <div className="space-y-4" ref={dropdownRef}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          placeholder="Search restaurants…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10"
          autoComplete="off"
        />
        
        {/* Dropdown Results */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 space-y-2">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((restaurant, index) => (
                  <div
                    key={restaurant.id}
                    className={`px-4 py-3 flex items-center space-x-3 cursor-pointer transition-colors ${
                      index === highlightedIndex 
                        ? 'bg-blue-50 border-l-2 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedRestaurant(restaurant);
                      setShowDropdown(false);
                      setSearchQuery("");
                      setDebouncedQuery("");
                      setHighlightedIndex(-1);
                    }}
                  >
                    {/* Thumbnail Image */}
                    {restaurant.thumbnailUrl ? (
                      <img 
                        src={restaurant.thumbnailUrl} 
                        alt={restaurant.name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-500 text-xs">No img</span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* Restaurant Name */}
                      <h3 className="font-medium text-gray-900 truncate">{restaurant.name}</h3>
                      {/* Average Rating */}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-600">{formatRating(restaurant.avgRating)}</span>
                        {restaurant.location && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-500 truncate">{restaurant.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : debouncedQuery.trim().length >= 2 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No restaurants found.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

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