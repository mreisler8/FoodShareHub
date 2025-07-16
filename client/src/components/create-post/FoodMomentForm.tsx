
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

    // Must have caption OR image (per your specs - relaxed validation)
    if (!caption.trim() && images.length === 0) {
      toast({
        title: "Add content",
        description: "Please add either a caption or a photo to share your moment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        postType: 'moment',
        content: caption || 'Food moment shared',
        images,
        tags,
        metadata: {
          postType: 'moment'
        }
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
            🍽️ Food Moment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Quick snapshot of what you're eating now - Instagram Story / BeReal style
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Upload - Optional */}
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

          {/* Caption - Optional but encouraged */}
          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="What are you eating? Quick note about this meal..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Share what you're enjoying right now
            </p>
          </div>

          {/* Tags - Optional */}
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
          {!caption.trim() && images.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Add either a photo or caption to share your food moment
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
          disabled={isSubmitting || (!caption.trim() && images.length === 0)}
        >
          {isSubmitting ? 'Creating...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
