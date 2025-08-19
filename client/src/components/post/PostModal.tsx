import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { MapPin, Star, X, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { MultiSelect } from '@/components/ui/multi-select';
import { CreateListModal } from '@/components/lists/CreateListModal';
import { RestaurantList } from '@shared/schema';
import MediaUploader from '@/components/MediaUploader';
import { VisibilitySelector } from '@/components/VisibilitySelector';
import { postService } from '@/services/postService';
import { OptimizedSearchModal } from '@/components/search/OptimizedSearchModal';
import { Restaurant } from '@/types/restaurant';

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: any; // Optional post for editing mode
}

export function PostModal({ open, onOpenChange, post }: PostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const isEditMode = !!post;

  // Form state
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState('');
  const [disliked, setDisliked] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [imageTags, setImageTags] = useState<string[]>([]);
  const [taggedListIds, setTaggedListIds] = useState<number[]>([]);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  
  // Visibility state
  const [visibilitySettings, setVisibilitySettings] = useState({
    public: true,
    followers: false,
    circleIds: [] as number[]
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (isEditMode && post && open) {
      // Set restaurant info
      if (post.restaurant) {
        setSelectedRestaurant({
          id: post.restaurantId?.toString() || '',
          name: post.restaurant.name,
          location: post.restaurant.location,
          source: 'database'
        });
      }

      // Set rating
      setRating(post.rating || 0);

      // Parse content to extract structured fields
      const content = post.content || '';
      const lines = content.split('\n\n');
      
      let likedText = '';
      let dislikedText = '';
      let notesText = '';

      lines.forEach((line: string) => {
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
        existingMedia.push(...post.images.map((url: string) => ({ url, thumbnailUrl: url, type: 'image' as const })));
      }
      if (post.videos && Array.isArray(post.videos)) {
        existingMedia.push(...post.videos.map((url: string) => ({ url, thumbnailUrl: url, type: 'video' as const })));
      }
      setMedia(existingMedia);
    }
  }, [isEditMode, post, open]);

  // Handle restaurant selection
  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  // Get user's restaurant lists for tagging
  const { data: userLists = [] } = useQuery({
    queryKey: ['/api/lists'],
    select: (data: any) => data?.lists || []
  });

  // Save post mutation using centralized service
  const savePostMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRestaurant || !rating || !liked.trim() || !user) {
        throw new Error('Missing required fields');
      }

      const postData = {
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        restaurantLocation: selectedRestaurant.location,
        rating,
        liked: liked.trim(),
        disliked: disliked.trim(),
        notes: notes.trim(),
        media,
        imageTags,
        taggedListIds,
        visibilitySettings,
        userId: user.id,
        postId: isEditMode ? post.id : undefined
      };

      return await postService.createPost(postData);
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
    setSelectedRestaurant(null);
    setRating(0);
    setLiked('');
    setDisliked('');
    setNotes('');
    setSelectedImages([]);
    setImageUrls([]);
    setMedia([]);
    setImageTags([]);
    setVisibilitySettings({
      public: true,
      followers: false,
      circleIds: []
    });
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

    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to create posts.',
        variant: 'destructive',
      });
      return;
    }

    // Submit using the centralized post service
    savePostMutation.mutate();
  };

  const isFormValid = selectedRestaurant && rating > 0 && liked.trim().length > 0;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Your Dining Experience' : 'Share Your Dining Experience'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Restaurant Search */}
          <div className="space-y-2">
            <Label htmlFor="restaurant-search">Find a restaurant</Label>
            {!selectedRestaurant ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setSearchModalOpen(true)}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Search for a restaurant...
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{selectedRestaurant.name}</p>
                  {selectedRestaurant.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedRestaurant.location}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRestaurant(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-2">
                {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'No rating'}
              </span>
            </div>
          </div>

          {/* What I Liked */}
          <div className="space-y-2">
            <Label htmlFor="liked">What I liked *</Label>
            <Textarea
              id="liked"
              placeholder="Describe what you enjoyed about this restaurant..."
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              className="min-h-[80px]"
              required
            />
          </div>

          {/* What I Didn't Like */}
          <div className="space-y-2">
            <Label htmlFor="disliked">What I didn't like (optional)</Label>
            <Textarea
              id="disliked"
              placeholder="Anything you didn't enjoy or would change..."
              value={disliked}
              onChange={(e) => setDisliked(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Additional Notes */}
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

          {/* Form Validation Message */}
          {!isFormValid && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              Please complete all required fields: restaurant selection, rating, and what you liked.
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={savePostMutation.isPending}
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
          setTaggedListIds([...taggedListIds, (newList as any).id]);
        }}
      />
    </Dialog>
    
    <OptimizedSearchModal
      open={searchModalOpen}
      onOpenChange={setSearchModalOpen}
      searchType="restaurants"
      showLocationServices={true}
      placeholder="Search for a restaurant..."
      onSelect={(result) => {
        setSelectedRestaurant({
          id: result.id,
          name: result.name,
          location: result.location || result.subtitle,
          address: result.location,
          avgRating: result.avgRating
        });
        setSearchModalOpen(false);
      }}
    />
    </>
  );
}