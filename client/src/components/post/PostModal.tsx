import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Search, MapPin, Star, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RestaurantSearchResult {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  avgRating: number;
  location?: string;
  source: 'database' | 'google';
}

interface SelectedRestaurant {
  id: string;
  name: string;
  location?: string;
  source: 'database' | 'google';
}

export function PostModal({ open, onOpenChange }: PostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Form state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<SelectedRestaurant | null>(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce as per user story

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search restaurants
  const { data: searchResults = [], isLoading: isSearching } = useQuery<RestaurantSearchResult[]>({
    queryKey: ['/api/search', debouncedQuery],
    enabled: debouncedQuery.length >= 1 && showSearchResults,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      if (!user) throw new Error('User not authenticated');
      
      const response = await apiRequest('POST', '/api/posts', {
        ...postData,
        userId: user.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      toast({
        title: 'Post created',
        description: 'Your dining post has been published successfully!',
      });
      
      // Reset form and close modal
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSearchQuery('');
    setSelectedRestaurant(null);
    setRating(0);
    setContent('');
    setShowSearchResults(false);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchResults(value.length >= 1);
    if (value.length === 0) {
      setSelectedRestaurant(null);
    }
  };

  const handleRestaurantSelect = (restaurant: RestaurantSearchResult) => {
    setSelectedRestaurant({
      id: restaurant.id,
      name: restaurant.name,
      location: restaurant.location,
      source: restaurant.source,
    });
    setSearchQuery(restaurant.name);
    setShowSearchResults(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRestaurant || !rating || !content.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please select a restaurant, add a rating, and write your review.',
        variant: 'destructive',
      });
      return;
    }

    // Extract restaurant ID for database restaurants, handle Google places differently
    const restaurantId = selectedRestaurant.source === 'database' 
      ? parseInt(selectedRestaurant.id)
      : selectedRestaurant.id; // Keep Google place IDs as strings for now

    createPostMutation.mutate({
      restaurantId,
      rating,
      content: content.trim(),
      visibility: 'public', // Default visibility for now
    });
  };

  const isFormValid = selectedRestaurant && rating > 0 && content.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Your Dining Experience</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Restaurant Search */}
          <div className="space-y-2">
            <Label htmlFor="restaurant-search">Find a restaurant</Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="restaurant-search"
                  type="text"
                  placeholder="Search for a restaurant..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((restaurant) => (
                        <li key={restaurant.id}>
                          <button
                            type="button"
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-3"
                            onClick={() => handleRestaurantSelect(restaurant)}
                          >
                            {restaurant.thumbnailUrl && (
                              <img 
                                src={restaurant.thumbnailUrl} 
                                alt={restaurant.name}
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {restaurant.name}
                              </p>
                              {restaurant.location && (
                                <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {restaurant.location}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-gray-500">
                                {restaurant.avgRating.toFixed(1)}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No matches found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected Restaurant Display */}
          {selectedRestaurant && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-900">{selectedRestaurant.name}</p>
                  {selectedRestaurant.location && (
                    <p className="text-sm text-green-700 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedRestaurant.location}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRestaurant(null);
                    setSearchQuery('');
                  }}
                  className="text-green-700 hover:text-green-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="space-y-2">
            <Label>Your Rating *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Content */}
          <div className="space-y-2">
            <Label htmlFor="content">What did you think? *</Label>
            <Textarea
              id="content"
              placeholder="Share your experience, what you liked, dishes you tried..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || createPostMutation.isPending}
              className="flex-1"
            >
              {createPostMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Share Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}