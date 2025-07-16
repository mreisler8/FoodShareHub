import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MapPin, 
  Star,
  UtensilsCrossed,
  Loader2,
  CheckCircle,
  Camera,
  Eye
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { VisibilitySelector } from '@/components/VisibilitySelector';
import { MediaUploader } from '@/components/MediaUploader';

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  cuisine?: string;
  rating?: number;
  source: 'database' | 'google';
}

interface RecommendDishFormProps {
  onSubmit: (data: any) => void;
  onPreview?: (data: any) => void;
  isLoading?: boolean;
  className?: string;
  initialData?: any;
  onStateChange?: (state: any) => void;
}

const TASTE_CATEGORIES = [
  'Sweet', 'Salty', 'Spicy', 'Sour', 'Bitter', 'Umami',
  'Crispy', 'Creamy', 'Tender', 'Chewy', 'Juicy', 'Flaky'
];

const DISH_CATEGORIES = [
  'Appetizer', 'Main Course', 'Dessert', 'Drink', 'Side Dish', 'Snack'
];

export function RecommendDishForm({ 
  onSubmit, 
  onPreview, 
  isLoading, 
  className = '', 
  initialData = {},
  onStateChange
}: RecommendDishFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState('');
  const [rating, setRating] = useState(0);
  const [tasteNotes, setTasteNotes] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [whyRecommend, setWhyRecommend] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const [imageTags, setImageTags] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibilitySettings, setVisibilitySettings] = useState({
    public: true,
    followers: false,
    circleIds: [] as number[]
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Restaurant search query
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['/api/search/unified', debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`);
      const data = await response.json();
      return data.restaurants || [];
    },
  });

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setSearchQuery(restaurant.name);
    setShowSearchResults(false);
  };

  const handleMediaChange = (files: any[]) => {
    setMedia(files);
  };

  const handleTagsChange = (tags: string[]) => {
    setImageTags(tags);
  };

  const toggleTasteNote = (taste: string) => {
    setTasteNotes(prev => 
      prev.includes(taste) 
        ? prev.filter(t => t !== taste)
        : [...prev, taste]
    );
  };

  const handleSubmit = () => {
    if (!selectedRestaurant || !dishName.trim() || !whyRecommend.trim()) {
      return;
    }

    const content = [
      `Dish: ${dishName}`,
      dishCategory && `Category: ${dishCategory}`,
      tasteNotes.length > 0 && `Taste notes: ${tasteNotes.join(', ')}`,
      description && `Description: ${description}`,
      whyRecommend && `Why I recommend it: ${whyRecommend}`
    ].filter(Boolean).join('\n\n');

    const formData = {
      postType: 'dish',
      restaurantId: selectedRestaurant.id,
      content,
      rating,
      images: media.filter(m => m.type === 'image').map(m => m.url),
      videos: media.filter(m => m.type === 'video').map(m => m.url),
      imageTags,
      visibility: visibilitySettings,
      metadata: {
        dishName,
        dishCategory,
        tasteNotes,
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
      `Dish: ${dishName}`,
      dishCategory && `Category: ${dishCategory}`,
      tasteNotes.length > 0 && `Taste notes: ${tasteNotes.join(', ')}`,
      description && `Description: ${description}`,
      whyRecommend && `Why I recommend it: ${whyRecommend}`
    ].filter(Boolean).join('\n\n');

    const formData = {
      postType: 'dish',
      restaurantId: selectedRestaurant.id,
      content,
      rating,
      images: media.filter(m => m.type === 'image').map(m => m.url),
      videos: media.filter(m => m.type === 'video').map(m => m.url),
      imageTags,
      visibility: visibilitySettings,
      metadata: {
        dishName,
        dishCategory,
        tasteNotes,
        restaurantName: selectedRestaurant.name,
        restaurantLocation: selectedRestaurant.location,
        hasPhotos: media.some(m => m.type === 'image'),
        hasVideos: media.some(m => m.type === 'video'),
        mediaCount: media.length
      }
    };

    onPreview(formData);
  };

  const canSubmit = selectedRestaurant && dishName.trim() && whyRecommend.trim() && rating > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Restaurant Search */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="restaurant">Restaurant *</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="restaurant"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search for a restaurant..."
              className="pl-10"
            />
            {selectedRestaurant && (
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Search Results */}
        {showSearchResults && searchQuery && (
          <Card className="p-4 max-h-60 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.slice(0, 5).map((restaurant: Restaurant) => (
                  <div
                    key={restaurant.id}
                    className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer"
                    onClick={() => handleRestaurantSelect(restaurant)}
                  >
                    <div>
                      <div className="font-medium">{restaurant.name}</div>
                      {restaurant.location && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {restaurant.location}
                        </div>
                      )}
                    </div>
                    {restaurant.rating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {restaurant.rating}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No restaurants found
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Dish Details */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="dishName">Dish Name *</Label>
          <Input
            id="dishName"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            placeholder="e.g. Margherita Pizza, Chicken Tikka Masala"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="dishCategory">Category</Label>
          <div className="mt-1">
            <select
              id="dishCategory"
              value={dishCategory}
              onChange={(e) => setDishCategory(e.target.value)}
              className="w-full p-2 border border-input rounded-md bg-background"
            >
              <option value="">Select category (optional)</option>
              {DISH_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the dish - ingredients, preparation, presentation..."
            className="mt-1"
            rows={3}
          />
        </div>
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
            {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Rate this dish'}
          </span>
        </div>
      </div>

      {/* Taste Notes */}
      <div className="space-y-2">
        <Label>Taste Notes</Label>
        <div className="flex flex-wrap gap-2">
          {TASTE_CATEGORIES.map(taste => (
            <Badge
              key={taste}
              variant={tasteNotes.includes(taste) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTasteNote(taste)}
            >
              {taste}
            </Badge>
          ))}
        </div>
        {tasteNotes.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Selected: {tasteNotes.join(', ')}
          </p>
        )}
      </div>

      {/* Why Recommend */}
      <div>
        <Label htmlFor="whyRecommend">Why do you recommend this dish? *</Label>
        <Textarea
          id="whyRecommend"
          value={whyRecommend}
          onChange={(e) => setWhyRecommend(e.target.value)}
          placeholder="Tell others why they should try this dish..."
          className="mt-1"
          rows={4}
        />
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <Label>Photos & Videos</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center space-y-2">
            <Camera className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Show off this amazing dish! (optional)
            </p>
          </div>
          <MediaUploader
            onChange={handleMediaChange}
            onTagsChange={handleTagsChange}
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
              Sharing Recommendation...
            </>
          ) : (
            <>
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Recommend This Dish
            </>
          )}
        </Button>
      </div>
    </div>
  );
}