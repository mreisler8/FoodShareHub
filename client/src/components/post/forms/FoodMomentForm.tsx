import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Search, 
  MapPin, 
  Star,
  Camera,
  Loader2,
  CheckCircle,
  Eye
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { VisibilitySelector } from '@/components/VisibilitySelector';
import { MediaUploader } from '@/components/MediaUploader';
import { UnifiedSearchModal } from '@/components/search/UnifiedSearchModal';

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  cuisine?: string;
  rating?: number;
  source: 'database' | 'google';
}

interface FoodMomentFormProps {
  onSubmit: (data: any) => void;
  onPreview?: (data: any) => void;
  isLoading?: boolean;
  className?: string;
  initialData?: any;
  onStateChange?: (state: any) => void;
}

export function FoodMomentForm({ 
  onSubmit, 
  onPreview, 
  isLoading, 
  className = '', 
  initialData = {},
  onStateChange
}: FoodMomentFormProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isRestaurantSearchOpen, setIsRestaurantSearchOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [whatILiked, setWhatILiked] = useState('');
  const [whatIDidntLike, setWhatIDidntLike] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const [imageTags, setImageTags] = useState<string[]>([]);
  const [visibilitySettings, setVisibilitySettings] = useState({
    public: true,
    followers: false,
    circleIds: [] as number[]
  });

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleMediaChange = (files: any[]) => {
    setMedia(files);
  };

  const handleTagsChange = (tags: string[]) => {
    setImageTags(tags);
  };

  const handleSubmit = () => {
    if (!selectedRestaurant || !whatILiked.trim()) {
      return;
    }

    const content = [
      whatILiked && `What I liked: ${whatILiked}`,
      whatIDidntLike && `What I didn't like: ${whatIDidntLike}`,
      additionalNotes && `Additional notes: ${additionalNotes}`
    ].filter(Boolean).join('\n\n');

    const formData = {
      postType: 'moment',
      restaurantId: selectedRestaurant.id,
      content,
      rating,
      images: media.filter(m => m.type === 'image').map(m => m.url),
      videos: media.filter(m => m.type === 'video').map(m => m.url),
      imageTags,
      visibility: visibilitySettings,
      metadata: {
        restaurantName: selectedRestaurant.name,
        restaurantLocation: selectedRestaurant.location,
        hasPhotos: media.some(m => m.type === 'image'),
        hasVideos: media.some(m => m.type === 'video'),
        mediaCount: media.length
      }
    };

    onSubmit(formData);
  };

  const handlePreview = () => {
    if (!canSubmit || !onPreview) return;

    const content = [
      whatILiked && `What I liked: ${whatILiked}`,
      whatIDidntLike && `What I didn't like: ${whatIDidntLike}`,
      additionalNotes && `Additional notes: ${additionalNotes}`
    ].filter(Boolean).join('\n\n');

    const formData = {
      postType: 'moment',
      restaurantId: selectedRestaurant.id,
      content,
      rating,
      images: media.filter(m => m.type === 'image').map(m => m.url),
      videos: media.filter(m => m.type === 'video').map(m => m.url),
      imageTags,
      visibility: visibilitySettings,
      metadata: {
        restaurantName: selectedRestaurant.name,
        restaurantLocation: selectedRestaurant.location,
        hasPhotos: media.some(m => m.type === 'image'),
        hasVideos: media.some(m => m.type === 'video'),
        mediaCount: media.length
      }
    };

    onPreview(formData);
  };

  const canSubmit = selectedRestaurant && whatILiked.trim() && rating > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Restaurant Search */}
      <div className="space-y-2">
        <Label htmlFor="restaurant">Restaurant *</Label>
        <Button
          variant="outline"
          onClick={() => setIsRestaurantSearchOpen(true)}
          className="w-full justify-start text-left h-10"
        >
          {selectedRestaurant ? (
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              <div>
                <div className="font-medium">{selectedRestaurant.name}</div>
                {selectedRestaurant.location && (
                  <div className="text-xs text-muted-foreground">{selectedRestaurant.location}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UtensilsCrossed className="h-4 w-4" />
              Search for a restaurant...
            </div>
          )}
        </Button>
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <Label>Your Rating *</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Select a rating'}
          </span>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <Label>Photos & Videos</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center space-y-2">
            <Camera className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Upload photos or videos of your food experience (optional)
            </p>
          </div>
          <MediaUploader
            onChange={handleMediaChange}
            onTagsChange={handleTagsChange}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Photos help your food moment get more engagement, but they're optional
        </p>
      </div>

      {/* Experience Details */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="liked">What I liked *</Label>
          <Textarea
            id="liked"
            value={whatILiked}
            onChange={(e) => setWhatILiked(e.target.value)}
            placeholder="Tell us what you enjoyed about this experience..."
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="disliked">What I didn't like</Label>
          <Textarea
            id="disliked"
            value={whatIDidntLike}
            onChange={(e) => setWhatIDidntLike(e.target.value)}
            placeholder="Anything that could have been better? (optional)"
            className="mt-1"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="notes">Additional notes</Label>
          <Textarea
            id="notes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any other thoughts about this experience? (optional)"
            className="mt-1"
            rows={2}
          />
        </div>
      </div>

      {/* Visibility Settings */}
      <div className="space-y-2">
        <Label>Visibility</Label>
        <VisibilitySelector
          value={visibilitySettings}
          onChange={setVisibilitySettings}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onPreview && (
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!canSubmit}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sharing Moment...
            </>
          ) : (
            'Share Food Moment'
          )}
        </Button>
      </div>

      <OptimizedSearchModal
        open={isRestaurantSearchOpen}
        onOpenChange={setIsRestaurantSearchOpen}
        searchType="restaurants"
        title="Select Restaurant"
        placeholder="Search for a restaurant..."
        showLocationServices={true}
        onSelect={(result) => {
          const restaurant: Restaurant = {
            id: result.id,
            name: result.name,
            location: result.location,
            cuisine: result.cuisine,
            rating: result.avgRating,
            source: result.metadata?.googlePlaceId ? 'google' : 'database'
          };
          handleRestaurantSelect(restaurant);
          setIsRestaurantSearchOpen(false);
        }}
      />
    </div>
  );
}