import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Plus, Star, MapPin, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ListItemForm } from "@/components/ListItemForm";

interface SearchResult {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  avgRating: number;
  location?: string;
  source: 'database' | 'google';
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
  }) => void;
  onAddCompleted?: () => void;
}

function RestaurantSearch({ listId, onRestaurantAdded, onAddCompleted }: RestaurantSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<SearchResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Restaurant search query
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['/api/search/unified', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) {
        throw new Error('Failed to search restaurants');
      }
      const data = await response.json();
      return data.restaurants || [];
    },
    enabled: debouncedQuery.length > 2,
    staleTime: 300000, // 5 minutes
  });

  // Handle restaurant selection
  const handleRestaurantSelect = (result: SearchResult) => {
    setSelectedRestaurant(result);
    setSearchQuery('');
    setShowSearchResults(false);
    setShowAddForm(true);
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.length > 2);
  };

  // Handle adding restaurant to list
  const addToListMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; rating: number; liked: string; disliked: string; notes: string }) => {
      return apiRequest(`/api/lists/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Restaurant added!",
        description: `${selectedRestaurant?.name} has been added to your list`,
      });
      
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}/items`] });
      
      // Reset form
      setSelectedRestaurant(null);
      setShowAddForm(false);
      setIsAdding(false);
      
      if (onAddCompleted) {
        onAddCompleted();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error adding restaurant",
        description: error.message || "Failed to add restaurant. Please try again.",
        variant: "destructive",
      });
      setIsAdding(false);
    },
  });

  const handleAddToList = (formData: { rating: number; liked: string; disliked: string; notes: string }) => {
    if (!selectedRestaurant) return;
    
    setIsAdding(true);
    addToListMutation.mutate({
      restaurantId: selectedRestaurant.id,
      rating: formData.rating,
      liked: formData.liked,
      disliked: formData.disliked,
      notes: formData.notes
    });
  };

  const handleCancel = () => {
    setSelectedRestaurant(null);
    setShowAddForm(false);
    setIsAdding(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
            <CardContent className="p-0">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Searching...</span>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="divide-y">
                  {searchResults.map((result: SearchResult) => (
                    <div
                      key={result.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRestaurantSelect(result)}
                    >
                      <div className="flex items-center gap-3">
                        {result.thumbnailUrl && (
                          <img 
                            src={result.thumbnailUrl} 
                            alt={result.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{result.name}</h4>
                          {result.location && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {result.location}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {result.avgRating > 0 && (
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{result.avgRating.toFixed(1)}</span>
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {result.source === 'database' ? 'Database' : 'Google'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No restaurants found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected Restaurant Form */}
      {showAddForm && selectedRestaurant && (
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="space-y-4">
              {/* Restaurant Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {selectedRestaurant.thumbnailUrl && (
                  <img 
                    src={selectedRestaurant.thumbnailUrl} 
                    alt={selectedRestaurant.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{selectedRestaurant.name}</h3>
                  {selectedRestaurant.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedRestaurant.location}
                    </p>
                  )}
                  {selectedRestaurant.avgRating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{selectedRestaurant.avgRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Add to List Form */}
              <ListItemForm
                restaurantId={selectedRestaurant.id}
                restaurantName={selectedRestaurant.name}
                onSave={handleAddToList}
                onCancel={handleCancel}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { RestaurantSearch };
export default RestaurantSearch;