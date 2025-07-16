
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Rating } from '@/components/ui/rating';
import { RestaurantSearch } from '@/components/restaurant/RestaurantSearch';
import { MediaUploader } from '@/components/MediaUploader';
import { VisibilitySelector } from '@/components/VisibilitySelector';
import { Camera, MapPin, Star, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  category?: string;
  priceRange?: string;
  source?: 'database' | 'google';
  googlePlaceId?: string;
}

interface FoodMomentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function FoodMomentForm({ onSubmit, onCancel }: FoodMomentFormProps) {
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [visibilitySettings, setVisibilitySettings] = useState({
    public: true,
    followers: false,
    circleIds: [] as number[]
  });

  const createMomentMutation = useMutation({
    mutationFn: async (momentData: FormData) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: momentData,
      });
      if (!response.ok) throw new Error('Failed to create moment');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Food moment shared!',
        description: 'Your dining experience has been shared with your circles.',
      });
      onSubmit(data);
    },
    onError: (error) => {
      toast({
        title: 'Error sharing moment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async () => {
    if (!selectedRestaurant) {
      toast({
        title: 'Restaurant required',
        description: 'Please select a restaurant for your food moment.',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Tell us about your experience',
        description: 'Please share some details about your dining experience.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedImages.length === 0) {
      toast({
        title: 'Photo required',
        description: 'Food moments require at least one photo.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('content', content);
    formData.append('rating', rating.toString());
    formData.append('visibility', JSON.stringify(visibilitySettings));
    formData.append('postType', 'moment');

    // Add restaurant data
    if (selectedRestaurant.source === 'database') {
      formData.append('restaurantId', selectedRestaurant.id);
    } else {
      formData.append('googlePlaceId', selectedRestaurant.googlePlaceId || '');
    }

    // Add images
    selectedImages.forEach((file) => {
      formData.append('media', file);
    });

    createMomentMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Food Moment Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Camera className="h-5 w-5 text-green-600" />
            </div>
            Share Your Food Moment
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Restaurant Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Where did you dine? *</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedRestaurant ? (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{selectedRestaurant.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedRestaurant.location}
                  </div>
                  {selectedRestaurant.category && (
                    <div className="text-xs text-muted-foreground">
                      {selectedRestaurant.category} • {selectedRestaurant.priceRange}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRestaurant(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <RestaurantSearch
              onSelectRestaurant={setSelectedRestaurant}
              placeholder="Search for the restaurant you visited..."
              buttonLabel="Find restaurant"
            />
          )}
        </CardContent>
      </Card>

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Photos *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MediaUploader
            onFilesSelected={setSelectedImages}
            maxFiles={5}
            acceptedFileTypes="image/*"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Share photos of your meal, the restaurant, or the dining experience
          </p>
        </CardContent>
      </Card>

      {/* Experience Details */}
      <Card>
        <CardHeader>
          <CardTitle>Your Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="rating">Rating *</Label>
            <div className="flex items-center gap-2 mt-1">
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

          <div>
            <Label htmlFor="content">Tell us about your experience *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did you love about this place? What dishes did you try? How was the service and atmosphere?"
              className="mt-1 min-h-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Share With</CardTitle>
        </CardHeader>
        <CardContent>
          <VisibilitySelector
            value={visibilitySettings}
            onChange={setVisibilitySettings}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="flex-1"
          disabled={createMomentMutation.isPending}
        >
          {createMomentMutation.isPending ? 'Sharing...' : 'Share Moment'}
        </Button>
      </div>
    </div>
  );
}
