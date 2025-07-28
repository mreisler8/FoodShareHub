import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaUploader } from '../MediaUploader';
import RestaurantSearch from '../restaurant/RestaurantSearch';
import { TagSelector } from '../post/TagSelector';
import { ShareDestinationPicker } from '../post/ShareDestinationPicker';
import { UtensilsCrossed, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecommendDishFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function RecommendDishForm({ onSubmit, onCancel }: RecommendDishFormProps) {
  const [dishName, setDishName] = useState('');
  const [rating, setRating] = useState(0);
  const [whatILiked, setWhatILiked] = useState('');
  const [whatIDidntLike, setWhatIDidntLike] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [shareDestination, setShareDestination] = useState('public');
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
        dishName,
        rating,
        whatILiked,
        whatIDidntLike,
        image,
        restaurant,
        tags,
        shareDestination,
        content: `${whatILiked ? `What I liked: ${whatILiked}` : ''}${whatILiked && whatIDidntLike ? '\n\n' : ''}${whatIDidntLike ? `What I didn't like: ${whatIDidntLike}` : ''}`,
        metadata: {
          postType: 'dish',
          dishName,
          rating,
          whatILiked,
          whatIDidntLike
        }
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5" />
          Dish Review
        </CardTitle>
        <p className="text-sm text-gray-600">
          Thoughtful opinion on a specific dish
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dish Name - Required */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Dish name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Margherita Pizza, Spicy Ramen"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
            />
          </div>

          {/* Rating - Required */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Rating (1-5 stars) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1">
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

          {/* What I liked - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              What I liked (optional)
            </label>
            <Textarea
              placeholder="What was great about this dish..."
              value={whatILiked}
              onChange={(e) => setWhatILiked(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* What I didn't like - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              What I didn't like (optional)
            </label>
            <Textarea
              placeholder="Any issues or things that could be better..."
              value={whatIDidntLike}
              onChange={(e) => setWhatIDidntLike(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Image - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Image (optional)
            </label>
            <MediaUploader
              onUpload={(file) => setImage(file)}
              maxFiles={1}
              acceptedTypes={['image/*']}
            />
          </div>

          {/* Restaurant */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Restaurant
            </label>
            <RestaurantSearch
              onSelect={setRestaurant}
              placeholder="Which restaurant? (optional but recommended)"
              value={restaurant}
            />
          </div>

          {/* Tags - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tags
            </label>
            <TagSelector
              selectedTags={tags}
              onTagsChange={setTags}
              placeholder="Add tags like #must-try #spicy #amazing"
            />
          </div>

          {/* Share Destination */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Destination</label>
            <ShareDestinationPicker
              value={shareDestination}
              onChange={setShareDestination}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !dishName.trim() || rating === 0}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Share Review'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}