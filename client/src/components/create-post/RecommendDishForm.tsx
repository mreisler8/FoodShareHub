import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaUploader } from '../MediaUploader';
import { RestaurantSearch } from '../restaurant/RestaurantSearch';
import { TagSelector } from '../post/TagSelector';
import { UtensilsCrossed, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecommendDishFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function RecommendDishForm({ onSubmit, onCancel }: RecommendDishFormProps) {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [dishName, setDishName] = useState('');
  const [rating, setRating] = useState(0);
  const [whatILiked, setWhatILiked] = useState('');
  const [whatIDidntLike, setWhatIDidntLike] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dishName.trim()) {
      toast({
        title: "Dish name required",
        description: "Please enter the name of the dish you're reviewing.",
        variant: "destructive",
      });
      return;
    }

    if (!restaurant) {
      toast({
        title: "Restaurant required",
        description: "Please select the restaurant where you had this dish.",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please rate this dish (1-5 stars).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        postType: 'dish',
        restaurant,
        dish: {
          name: dishName,
          rating: rating,
          whatILiked: whatILiked,
          whatIDidntLike: whatIDidntLike
        },
        content: `${whatILiked ? `What I liked: ${whatILiked}` : ''}${whatILiked && whatIDidntLike ? '\n\n' : ''}${whatIDidntLike ? `What I didn't like: ${whatIDidntLike}` : ''}`,
        images,
        rating,
        tags,
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting dish review:', error);
      toast({
        title: "Error",
        description: "Failed to create dish review. Please try again.",
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
            <UtensilsCrossed className="h-5 w-5" />
            Dish Review
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Thoughtful opinion on a specific dish
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dish Name */}
          <div>
            <Label htmlFor="dishName">Dish name *</Label>
            <Input
              id="dishName"
              placeholder="e.g., Margherita Pizza, Spicy Ramen"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
            />
          </div>

          {/* Rating */}
          <div>
            <Label>Rating (1–5 stars) *</Label>
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
                <span className="ml-2 text-sm text-gray-600">
                  {rating}/5 stars
                </span>
              )}
            </div>
          </div>

          {/* What I liked */}
          <div>
            <Label htmlFor="whatILiked">What I liked (optional)</Label>
            <Textarea
              id="whatILiked"
              placeholder="What was great about this dish..."
              value={whatILiked}
              onChange={(e) => setWhatILiked(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* What I didn't like */}
          <div>
            <Label htmlFor="whatIDidntLike">What I didn't like (optional)</Label>
            <Textarea
              id="whatIDidntLike"
              placeholder="Any issues or things that could be better..."
              value={whatIDidntLike}
              onChange={(e) => setWhatIDidntLike(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label>Image (optional)</Label>
            <MediaUploader
              onImagesChange={setImages}
              maxImages={1}
              acceptedTypes={['image/*']}
            />
          </div>

          {/* Restaurant Selection */}
          <div>
            <Label htmlFor="restaurant">Restaurant *</Label>
            <RestaurantSearch
              onSelect={setRestaurant}
              placeholder="Which restaurant?"
              value={restaurant}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <TagSelector
              selectedTags={tags}
              onTagsChange={setTags}
              suggestedTags={[
                'must-try', 'overrated', 'amazing', 'disappointing', 
                'worth-it', 'spicy', 'sweet', 'savory', 'vegetarian', 'authentic'
              ]}
              placeholder="Tag this dish review..."
            />
          </div>
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
          disabled={isSubmitting || !dishName.trim() || !restaurant || rating === 0}
        >
          {isSubmitting ? 'Creating...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}