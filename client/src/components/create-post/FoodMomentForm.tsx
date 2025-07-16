import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaUploader } from '../MediaUploader';
import { TagSelector } from '../post/TagSelector';
import { Camera, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FoodMomentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function FoodMomentForm({ onSubmit, onCancel }: FoodMomentFormProps) {
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Must have caption (image is optional per your specs)
    if (!caption.trim()) {
      toast({
        title: "Add a caption",
        description: "Quick caption required - what are you eating?",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        postType: 'moment',
        content: caption,
        images,
        tags,
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
            Quick snapshot of what you're eating now - Instagram Story style
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Caption - Required */}
          <div>
            <Label htmlFor="caption">Caption *</Label>
            <Textarea
              id="caption"
              placeholder="What are you eating? Quick note about this meal..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Photo Upload - Optional */}
          <div>
            <Label>Image (optional)</Label>
            <MediaUploader
              onImagesChange={setImages}
              maxImages={1}
              acceptedTypes={['image/*']}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Add a photo to make your moment more engaging
            </p>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (optional)</Label>
            <TagSelector
              selectedTags={tags}
              onTagsChange={setTags}
              suggestedTags={[
                'delicious', 'spicy', 'sweet', 'homemade', 'takeout',
                'brunch', 'dinner', 'snack', 'healthy', 'comfort-food'
              ]}
              placeholder="Add tags to categorize your moment..."
            />
          </div>

          {/* Validation Helper */}
          {!caption.trim() && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Add a quick caption about what you're eating
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
          disabled={isSubmitting || !caption.trim()}
        >
          {isSubmitting ? 'Creating...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}