import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Search, MapPin, Star, X, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { MultiSelect } from '@/components/ui/multi-select';
import { CreateListModal } from '@/components/lists/CreateListModal';
import { RestaurantList } from '@shared/schema';
import MediaUploader from '@/components/MediaUploader';
import { VisibilitySelector } from '@/components/VisibilitySelector';

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: any; // Optional post for editing mode
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

export function PostModal({ open, onOpenChange, post }: PostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isEditMode = !!post;

  // Form state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<SelectedRestaurant | null>(null);
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState('');
  const [disliked, setDisliked] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [imageTags, setImageTags] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [taggedListIds, setTaggedListIds] = useState<number[]>([]);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  
  // Visibility state
  const [visibilitySettings, setVisibilitySettings] = useState({
    public: true,
    followers: false,
    circleIds: [] as number[]
  });

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce as per user story

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pre-populate form when editing
  useEffect(() => {
    if (isEditMode && post && open) {
      // Set restaurant info
      if (post.restaurant) {
        setSelectedRestaurant({
          id: post.restaurantId.toString(),
          name: post.restaurant.name,
          location: post.restaurant.location,
          source: 'database'
        });
        setSearchQuery(post.restaurant.name);
      }

      // Set rating
      setRating(post.rating || 0);

      // Parse content to extract structured fields
      const content = post.content || '';
      const lines = content.split('\n\n');
      
      let likedText = '';
      let dislikedText = '';
      let notesText = '';

      lines.forEach(line => {
        if (line.startsWith('What I liked:')) {
          likedText = line.replace('What I liked:', '').trim();
        } else if (line.startsWith('What I didn\'t like:')) {
          dislikedText = line.replace('What I didn\'t like:', '').trim();
        } else if (line.startsWith('Additional notes:')) {
          notesText = line.replace('Additional notes:', '').trim();
        } else if (!line.startsWith('What I liked:') && !line.startsWith('What I didn\'t like:') && !line.startsWith('Additional notes:')) {
          // If content doesn't follow the structured format, put it all in liked
          if (!likedText) likedText = line;
        }
      });

      setLiked(likedText);
      setDisliked(dislikedText);
      setNotes(notesText);

      // Set existing media
      if (post.images && Array.isArray(post.images)) {
        setImageUrls(post.images);
      }
      
      // Set existing media for uploader
      const existingMedia = [];
      if (post.images && Array.isArray(post.images)) {
        existingMedia.push(...post.images.map(url => ({ url, thumbnailUrl: url, type: 'image' as const })));
      }
      if (post.videos && Array.isArray(post.videos)) {
        existingMedia.push(...post.videos.map(url => ({ url, thumbnailUrl: url, type: 'video' as const })));
      }
      setMedia(existingMedia);
    }
  }, [isEditMode, post, open]);

  // Search restaurants
  const { data: searchResults = [], isLoading: isSearching } = useQuery<RestaurantSearchResult[]>({
    queryKey: ['/api/restaurants', debouncedQuery],
    enabled: debouncedQuery.length >= 1 && showSearchResults,
  });

  // Fetch user lists for tagging
  const { data: userLists = [] } = useQuery<RestaurantList[]>({
    queryKey: ['/api/lists'],
    enabled: !!user,
  });

  // Create/Update post mutation
  const savePostMutation = useMutation({
    mutationFn: async (postData: any) => {
      if (!user) throw new Error('User not authenticated');
      
      if (isEditMode && post) {
        // Update existing post
        const response = await apiRequest('PUT', `/api/posts/${post.id}`, postData);
        return response.json();
      } else {
        // Create new post
        const response = await apiRequest('POST', '/api/posts', {
          ...postData,
          userId: user.id,
          listIds: taggedListIds,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      if (isEditMode && post) {
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
      }
      
      toast({
        title: isEditMode ? 'Post updated' : 'Post created',
        description: isEditMode 
          ? 'Your dining post has been updated successfully!' 
          : 'Your dining post has been published successfully!',
      });
      
      // Reset form and close modal
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} post. Please try again.`,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSearchQuery('');
    setSelectedRestaurant(null);
    setRating(0);
    setLiked('');
    setDisliked('');
    setNotes('');
    setSelectedImages([]);
    setImageUrls([]);
    setMedia([]);
    setImageTags([]);
    setShowSearchResults(false);
    setVisibilitySettings({
      public: true,
      followers: false,
      circleIds: []
    });
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
    
    if (!selectedRestaurant || !rating || !liked.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please select a restaurant, add a rating, and tell us what you liked.',
        variant: 'destructive',
      });
      return;
    }

    // Combine the structured fields into content for current schema compatibility
    const contentParts = [];
    if (liked.trim()) contentParts.push(`What I liked: ${liked.trim()}`);
    if (disliked.trim()) contentParts.push(`What I didn't like: ${disliked.trim()}`);
    if (notes.trim()) contentParts.push(`Additional notes: ${notes.trim()}`);
    const content = contentParts.join('\n\n');

    // Extract media URLs
    const images = media.filter(f => f.type === 'image').map(f => f.url);
    const videos = media.filter(f => f.type === 'video').map(f => f.url);

    // Handle restaurant ID - if Google place, we need to create/find the restaurant first
    if (selectedRestaurant.source === 'google') {
      // For Google Places, we'll need to create the restaurant first
      // For now, show an error message as this requires additional API integration
      toast({
        title: 'Google Places Integration',
        description: 'Creating posts with Google Places restaurants will be implemented in the next iteration.',
        variant: 'destructive',
      });
      return;
    }

    const restaurantId = parseInt(selectedRestaurant.id);

    savePostMutation.mutate({
      userId: user.id,
      restaurantId,
      rating,
      content,
      images,
      videos,
      imageTags,
      visibility: visibilitySettings
    });
  };

  const isFormValid = selectedRestaurant && rating > 0 && liked.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Your Dining Experience' : 'Share Your Dining Experience'}</DialogTitle>
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
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{selectedRestaurant.name}</p>
                  {selectedRestaurant.location && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
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
                  className="text-gray-600 hover:text-gray-800"
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

          {/* What I Liked - Required */}
          <div className="space-y-2">
            <Label htmlFor="liked">What I liked *</Label>
            <Textarea
              id="liked"
              placeholder="Tell us what you enjoyed about this place..."
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* What I Didn't Like - Optional */}
          <div className="space-y-2">
            <Label htmlFor="disliked">What I didn't like (optional)</Label>
            <Textarea
              id="disliked"
              placeholder="Any areas for improvement..."
              value={disliked}
              onChange={(e) => setDisliked(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Additional Notes - Optional */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any other thoughts, dishes tried, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Photos & Videos</Label>
            <MediaUploader 
              onChange={setMedia} 
              onTagsChange={setImageTags}
            />
          </div>

          {/* Visibility Settings */}
          <VisibilitySelector
            value={visibilitySettings}
            onChange={setVisibilitySettings}
            className="space-y-2"
          />

          {/* List Tagging */}
          <div className="space-y-2">
            <Label htmlFor="lists">Add to list(s) (optional)</Label>
            <MultiSelect
              options={userLists.map(list => ({ id: list.id, name: list.name }))}
              selected={taggedListIds}
              onChange={setTaggedListIds}
              placeholder="Select lists to tag this post..."
              emptyMessage="You have no lists"
              emptyAction={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateListOpen(true)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create one now
                </Button>
              }
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
              disabled={!isFormValid || savePostMutation.isPending}
              className="flex-1"
            >
              {savePostMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Posting...'}
                </>
              ) : (
                isEditMode ? 'Update Post' : 'Share Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* Create List Modal */}
      <CreateListModal
        open={isCreateListOpen}
        onOpenChange={setIsCreateListOpen}
        onSuccess={(newList) => {
          queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
          setTaggedListIds([...taggedListIds, newList.id]);
        }}
      />
    </Dialog>
  );
}