
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RestaurantSearch } from '@/components/restaurant/RestaurantSearch';
import { MediaUploader } from '@/components/MediaUploader';
import { VisibilitySelector } from '@/components/VisibilitySelector';
import { Utensils, MapPin, Star, Image } from 'lucide-react';
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

interface RecommendDishFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function RecommendDishForm({ onSubmit, onCancel }: RecommendDishFormProps) {
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [dishName, setDishName] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [visibilitySettings, setVisibilitySettings] = useState({
    public: true,
    followers: false,
    circleIds: [] as number[]
  });

  const createRecommendationMutation = useMutation({
    mutationFn: async (recommendationData: FormData) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: recommendationData,
      });
      if (!response.ok) throw new Error('Failed to create recommendation');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Dish recommendation shared!',
        description: 'Your dish recommendation has been shared with your circles.',
      });
      onSubmit(data);
    },
    onError: (error) => {
      toast({
        title: 'Error sharing recommendation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async () => {
    if (!selectedRestaurant) {
      toast({
        title: 'Restaurant required',
        description: 'Please select the restaurant where you tried this dish.',
        variant: 'destructive',
      });
      return;
    }

    if (!dishName.trim()) {
      toast({
        title: 'Dish name required',
        description: 'Please enter the name of the dish you\'re recommending.',
        variant: 'destructive',
      });
      return;
    }

    if (!recommendation.trim()) {
      toast({
        title: 'Tell us why you recommend it',
        description: 'Please share why others should try this dish.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('content', `${dishName} at ${selectedRestaurant.name} - ${recommendation}`);
    formData.append('rating', '5'); // Default high rating for recommendations
    formData.append('visibility', JSON.stringify(visibilitySettings));
    formData.append('postType', 'dish');
    formData.append('dishName', dishName);

    // Add restaurant data
    if (selectedRestaurant.source === 'database') {
      formData.append('restaurantId', selectedRestaurant.id);
    } else {
      formData.append('googlePlaceId', selectedRestaurant.googlePlaceId || '');
    }

    // Add images (optional for dish recommendations)
    selectedImages.forEach((file) => {
      formData.append('media', file);
    });

    createRecommendationMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Dish Recommendation Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Utensils className="h-5 w-5 text-orange-600" />
            </div>
            Recommend a Dish
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Dish Details */}
      <Card>
        <CardHeader>
          <CardTitle>What dish are you recommending? *</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="dishName">Dish Name *</Label>
            <Input
              id="dishName"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="e.g., Truffle Pasta, Spicy Tuna Roll, Chocolate Lava Cake"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Restaurant Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Where can people find this dish? *</CardTitle>
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
              placeholder="Search for the restaurant..."
              buttonLabel="Find restaurant"
            />
          )}
        </CardContent>
      </Card>

      {/* Recommendation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Why do you recommend this dish? *</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="recommendation">Your Recommendation *</Label>
            <Textarea
              id="recommendation"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="What makes this dish special? How does it taste? What should people expect?"
              className="mt-1 min-h-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Photos (optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MediaUploader
            onFilesSelected={setSelectedImages}
            maxFiles={3}
            acceptedFileTypes="image/*"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Add photos of the dish to help others know what to expect
          </p>
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
          disabled={createRecommendationMutation.isPending}
        >
          {createRecommendationMutation.isPending ? 'Sharing...' : 'Share Recommendation'}
        </Button>
      </div>
    </div>
  );
}
