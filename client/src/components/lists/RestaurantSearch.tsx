import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, Plus, Star, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ListItemForm } from "@/components/ListItemForm";

// Create apiFetch function for GET requests with authentication
async function apiFetch(url: string): Promise<any> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Updated search result interface to match new API
interface SearchResult {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  avgRating: number;
  location?: string;
  source: 'database' | 'google';
}

// Type for list items in state management
interface ListItem {
  id: number;
  restaurantId: number;
  rating: number;
  liked: string | null;
  disliked: string | null;
  notes: string | null;
}

interface RestaurantSearchProps {
  listId: number;
  onRestaurantAdded?: (data: {
    restaurantId: string;
    restaurantName: string;
    rating: number;
    liked: string;
    disliked: string;
    notes: string;
  }) => Promise<void>;
  onAddCompleted?: () => void;
}

export function RestaurantSearch({ listId, onRestaurantAdded, onAddCompleted }: RestaurantSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
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

  // Search using apiFetch when debounced term changes
  useEffect(() => {
    const searchRestaurants = async () => {
      if (debouncedQuery.trim().length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      setShowDropdown(true);

      try {
        const results = await apiFetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
        // Limit results to 5 maximum as per user story
        setSearchResults(results.slice(0, 5));
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
        toast({
          title: "Search Error",
          description: "Failed to search restaurants. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    };

    searchRestaurants();
  }, [debouncedQuery, toast]);

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

  // Handle adding restaurant using the inline form approach
  const addToListMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; rating: number; liked: string; disliked: string; notes: string }) => {
      // Find the restaurant being added
      const restaurant = searchResults.find(r => r.id === data.restaurantId);
      if (!restaurant) throw new Error("Restaurant not found");

      // Handle both database and Google Places results
      let restaurantId: number;

      if (restaurant.source === 'database') {
        restaurantId = parseInt(restaurant.id);
      } else {
        // For Google Places results, we need to create a restaurant first
        const response = await apiRequest("POST", "/api/restaurants", {
          name: restaurant.name,
          location: restaurant.location || "Unknown location",
          category: "Restaurant",
          priceRange: "$$",
          cuisine: "Restaurant",
          imageUrl: restaurant.thumbnailUrl,
          googlePlaceId: restaurant.id.replace('google_', ''),
        });
        const newRestaurant = await response.json() as { id: number };
        restaurantId = newRestaurant.id;
      }

      const payload = {
        restaurantId: restaurantId,
        rating: data.rating,
        liked: data.liked || null,
        disliked: data.disliked || null,
        notes: data.notes || null,
      };

      return await apiRequest("POST", `/api/lists/${listId}/items`, payload);
    },
    onSuccess: (_, variables) => {
      // Invalidate list details to refresh items
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}`] });

      const restaurant = searchResults.find(r => r.id === variables.restaurantId);
      toast({
        title: "Restaurant added!",
        description: `${restaurant?.name} has been added to your list.`,
      });

      // Reset state
      setAddingId(null);
      setSearchQuery("");
      setDebouncedQuery("");
      setSearchResults([]);
      setShowDropdown(false);

      // Call completion callback if provided (only for legacy non-optimistic usage)
      if (onAddCompleted) {
        onAddCompleted();
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

  // Handle saving from inline form
  const handleSave = async (data: { rating: number; liked: string; disliked: string; notes: string }) => {
    if (!addingId) return;

    // Find the restaurant name for the optimistic callback
    const restaurant = searchResults.find(r => r.id === addingId);
    const restaurantName = restaurant?.name || "Unknown Restaurant";

    // If we have an optimistic callback, use it
    if (onRestaurantAdded) {
      try {
        await onRestaurantAdded({
          restaurantId: addingId,
          restaurantName: restaurantName,
          rating: data.rating,
          liked: data.liked,
          disliked: data.disliked,
          notes: data.notes
        });

        // Reset state on success
        setAddingId(null);
        setSearchQuery("");
        setDebouncedQuery("");
        setSearchResults([]);
        setShowDropdown(false);

        // Call completion callback
        if (onAddCompleted) {
          onAddCompleted();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add restaurant to list.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback to old mutation pattern
      addToListMutation.mutate({
        restaurantId: addingId,
        ...data
      });
    }
  };

  // Handle canceling inline form
  const handleCancel = () => {
    setAddingId(null);
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
                {searchResults.map((restaurant: SearchResult, index: number) => (
                  <div key={restaurant.id}>
                    {addingId === restaurant.id ? (
                      // Show inline form when this restaurant is being added
                      <div className="px-4 py-3">
                        <ListItemForm
                          restaurantId={restaurant.id}
                          restaurantName={restaurant.name}
                          onSave={handleSave}
                          onCancel={handleCancel}
                        />
                      </div>
                    ) : (
                      // Show normal restaurant result with Add button
                      <div
                        className={`px-4 py-3 flex items-center space-x-3 transition-colors ${
                          index === highlightedIndex 
                            ? 'bg-blue-50 border-l-2 border-blue-500' 
                            : 'hover:bg-gray-50'
                        }`}
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

                        {/* Add Button */}
                        <Button
                          className="add-btn flex-shrink-0"
                          size="sm"
                          onClick={() => setAddingId(restaurant.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    )}
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

      {/* Inline forms are now rendered within the dropdown results */}
    </div>
  );
}