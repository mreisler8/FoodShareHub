
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Rating } from '@/components/ui/rating';
import { RestaurantSearch } from '@/components/restaurant/RestaurantSearch';
import { MediaUploader } from '@/components/MediaUploader';
import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  category?: string;
  priceRange?: string;
  cuisine?: string;
  address?: string;
  source?: 'database' | 'google';
  googlePlaceId?: string;
}

interface PostData {
  content: string;
  rating: number;
  restaurantId?: number;
  media?: File[];
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [media, setMedia] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: PostData) => {
      const formData = new FormData();
      formData.append('content', postData.content);
      formData.append('rating', postData.rating.toString());
      
      if (postData.restaurantId) {
        formData.append('restaurantId', postData.restaurantId.toString());
      }
      
      // Add media files
      postData.media?.forEach((file, index) => {
        formData.append(`media`, file);
      });

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create post' }));
        throw new Error(errorData.error || 'Failed to create post');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Your post has been created!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      navigate('/feed');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post',
        variant: 'destructive',
      });
    },
  });

  // Handle restaurant selection
  const handleRestaurantSelect = async (restaurant: Restaurant) => {
    console.log('Selected restaurant:', restaurant);
    
    // If it's a Google Places result, save it to our database first
    if (restaurant.source === 'google' && restaurant.googlePlaceId) {
      try {
        const response = await fetch('/api/google/places/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ placeId: restaurant.googlePlaceId }),
        });

        if (response.ok) {
          const savedRestaurant = await response.json();
          setSelectedRestaurant({
            ...restaurant,
            id: savedRestaurant.id.toString(),
            source: 'database'
          });
        } else {
          // Use the Google Places data as-is if saving fails
          setSelectedRestaurant(restaurant);
        }
      } catch (error) {
        console.error('Error saving Google Place:', error);
        setSelectedRestaurant(restaurant);
      }
    } else {
      setSelectedRestaurant(restaurant);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Please add some content to your post',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedRestaurant) {
      toast({
        title: 'Error',
        description: 'Please select a restaurant',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const postData: PostData = {
        content: content.trim(),
        rating,
        media,
      };

      // Only add restaurantId if it's a numeric ID from our database
      if (selectedRestaurant.source === 'database' && !selectedRestaurant.id.startsWith('google_')) {
        postData.restaurantId = parseInt(selectedRestaurant.id);
      }

      await createPostMutation.mutateAsync(postData);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Create Post</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Restaurant Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Restaurant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedRestaurant ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{selectedRestaurant.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedRestaurant.location || selectedRestaurant.address}
                      </div>
                      {selectedRestaurant.category && (
                        <div className="text-xs text-muted-foreground">
                          {selectedRestaurant.category} • {selectedRestaurant.priceRange}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRestaurant(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <RestaurantSearch
                  onSelectRestaurant={handleRestaurantSelect}
                  buttonLabel="Search and select a restaurant"
                  placeholder="Search for restaurants..."
                />
              )}
            </CardContent>
          </Card>

          {/* Post Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rating */}
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <div className="flex items-center gap-2">
                  <Rating
                    value={rating}
                    onChange={setRating}
                    className="text-lg"
                  />
                  <span className="text-sm text-muted-foreground">
                    {rating} star{rating !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Tell us about your experience</Label>
                <Textarea
                  id="content"
                  placeholder="What did you think of this place? What did you order? Any recommendations?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-24"
                  required
                />
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label>Photos (optional)</Label>
                <MediaUploader
                  onFilesSelected={setMedia}
                  maxFiles={5}
                  acceptedFileTypes="image/*"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim() || !selectedRestaurant}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
