import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MediaUploader } from '../MediaUploader';
import { RestaurantSearch } from '../restaurant/RestaurantSearch';
import { Camera, MapPin, Star, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FoodMomentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function FoodMomentForm({ onSubmit, onCancel }: FoodMomentFormProps) {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Relaxed validation - allow photo OR caption
    if (!images.length && !caption.trim()) {
      toast({
        title: "Add content",
        description: "Add a quick note or photo before sharing.",
        variant: "destructive",
      });
      return;
    }

    if (!restaurant) {
      toast({
        title: "Select restaurant",
        description: "Please select a restaurant for your food moment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        postType: 'moment',
        restaurant,
        content: caption,
        images,
        rating: rating > 0 ? rating : null,
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting food moment:', error);
      toast({
        title: "Error",
        description: "Failed to create food moment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Food Moment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Share a quick snapshot of what you're eating now
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Restaurant Selection */}
          <div>
            <Label htmlFor="restaurant">Restaurant *</Label>
            <RestaurantSearch
              onSelect={setRestaurant}
              placeholder="Where are you eating?"
              value={restaurant}
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label>Photo (optional)</Label>
            <MediaUploader
              onImagesChange={setImages}
              maxImages={3}
              acceptedTypes={['image/*']}
            />
          </div>

          {/* Caption */}
          <div>
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder="What's good about this meal?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Rating */}
          <div>
            <Label>Rating (optional)</Label>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="ml-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Validation Helper */}
          {!images.length && !caption.trim() && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Add a photo or caption to share your food moment
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || (!images.length && !caption.trim())}
        >
          {isSubmitting ? 'Creating...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}