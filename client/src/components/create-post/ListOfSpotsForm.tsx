import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MediaUploader } from '../MediaUploader';
import { RestaurantSearch } from '../restaurant/RestaurantSearch';
import { TagSelector } from '../post/TagSelector';
import { MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RestaurantRecFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function ListOfSpotsForm({ onSubmit, onCancel }: RestaurantRecFormProps) {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [city, setCity] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saveToList, setSaveToList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalRestaurantName = restaurant?.name || restaurantName;

    if (!finalRestaurantName.trim()) {
      toast({
        title: "Restaurant name required",
        description: "Please enter or select a restaurant name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        postType: 'restaurant',
        restaurant: restaurant || {
          name: restaurantName,
          cuisine: cuisineType,
          location: city,
        },
        content: notes || `Recommending ${finalRestaurantName}`,
        tags,
        images,
        metadata: {
          postType: 'restaurant',
          restaurantName: finalRestaurantName,
          cuisineType,
          city,
          saveToList,
          notes
        }
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting restaurant recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to create restaurant recommendation. Please try again.",
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
            <MapPin className="h-5 w-5" />
            📍 Restaurant Rec
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Shoutout a restaurant you love
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Restaurant Name - Required */}
          <div>
            <Label>Restaurant name (required)</Label>
            <RestaurantSearch
              onSelect={(selectedRestaurant) => {
                setRestaurant(selectedRestaurant);
                setRestaurantName('');
              }}
              placeholder="Search for a restaurant..."
              value={restaurant}
            />

            {!restaurant && (
              <div className="mt-2">
                <Input
                  placeholder="Or type restaurant name manually..."
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Type / Cuisine - Optional */}
          <div>
            <Label htmlFor="cuisineType">Type / cuisine (optional)</Label>
            <Input
              id="cuisineType"
              placeholder="e.g., Italian, Thai, Burger Joint"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
            />
          </div>

          {/* City - Optional */}
          <div>
            <Label htmlFor="city">City (optional)</Label>
            <Input
              id="city"
              placeholder="e.g., New York, Toronto, Los Angeles"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {/* Tags - Optional */}
          <div>
            <Label>Tags</Label>
            <TagSelector
              selectedTags={tags}
              onTagsChange={setTags}
              suggestedTags={[
                'must-try', 'hidden-gem', 'date-night', 'family-friendly',
                'affordable', 'upscale', 'casual', 'authentic', 'trendy', 'cozy'
              ]}
              placeholder="Tag this restaurant..."
            />
          </div>

          {/* Notes / Why recommend - Optional */}
          <div>
            <Label htmlFor="notes">Notes / why you recommend it</Label>
            <Textarea
              id="notes"
              placeholder="Tell others why they should try this place..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Image - Optional */}
          <div>
            <Label>Image (optional)</Label>
            <MediaUploader
              onImagesChange={setImages}
              maxImages={1}
              acceptedTypes={['image/*']}
            />
          </div>

          {/* Save to List Toggle - Optional */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="saveToList">Save to List toggle</Label>
              <p className="text-sm text-muted-foreground">
                Optional: Add this restaurant to your saved lists
              </p>
            </div>
            <Switch
              id="saveToList"
              checked={saveToList}
              onCheckedChange={setSaveToList}
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
          disabled={isSubmitting || (!restaurant && !restaurantName.trim())}
        >
          {isSubmitting ? 'Creating...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}