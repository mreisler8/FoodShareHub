import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowLeft, Star, Upload, Search, MapPin, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ModernCreatePostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: string;
}

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  address?: string;
  avgRating?: number;
}

export function ModernCreatePost({ open, onOpenChange, defaultType }: ModernCreatePostProps) {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showRestaurantResults, setShowRestaurantResults] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    restaurant: null as Restaurant | null,
    rating: 0,
    dishName: '',
    category: '',
    description: '',
    tags: [] as string[]
  });

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch restaurant search results
  const { data: restaurants, isLoading: isSearchLoading } = useQuery({
    queryKey: ['/api/search/unified', { q: debouncedQuery }],
    queryFn: async () => {
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      return data.restaurants || [];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const recommendedTypes = [
    {
      type: 'moment',
      title: 'Food Moment',
      description: 'Quick snapshot of what you\'re eating right now.',
      icon: '🍽️'
    },
    {
      type: 'dish',
      title: 'Dish Review',
      description: 'Share your thoughtful opinion on a specific dish.',
      icon: '🍕'
    }
  ];

  const allPostTypes = [
    { type: 'moment', title: 'Food Moment', description: 'Quick snapshot of what you\'re eating now', icon: '🍽️' },
    { type: 'dish', title: 'Dish Review', description: 'Thoughtful opinion on a specific dish', icon: '🍕' },
    { type: 'restaurant', title: 'Restaurant Rec', description: 'Shoutout a restaurant you love', icon: '📍' }
  ];

  const suggestedTags = ['Spicy', 'Comfort Food', 'Healthy', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Must Try', 'Hidden Gem', 'Date Night', 'Family Friendly', 'Quick Bite', 'Instagrammable'];
  const categories = ['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Salad', 'Soup', 'Pasta', 'Pizza', 'Burger', 'Sushi'];

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setFormData(prev => ({ ...prev, restaurant }));
    setSearchQuery(restaurant.name);
    setShowRestaurantResults(false);
  };

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = async () => {
    try {
      const response = await apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          postType: selectedType,
          restaurant: formData.restaurant,
          rating: formData.rating,
          dishName: formData.dishName,
          category: formData.category,
          description: formData.description,
          tags: formData.tags
        }),
      });

      toast({
        title: "Success!",
        description: "Your post has been created successfully.",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isSubmitDisabled = !formData.restaurant || !formData.rating || !formData.dishName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step === 'form' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStep('type')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="flex items-center gap-2">
                <span className="text-orange-500">🍕</span>
                {step === 'type' ? 'Choose Post Type' : 'Create Your Post'}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {step === 'type' ? (
          <div className="space-y-6">
            {/* Recommended Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-orange-500">🍕</span>
                  Recommended for you
                </h3>
                <Button variant="ghost" size="sm">
                  Show all
                </Button>
              </div>

              <div className="space-y-3">
                {recommendedTypes.map((type) => (
                  <Card
                    key={type.type}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTypeSelect(type.type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{type.icon}</span>
                          <div>
                            <h4 className="font-medium">{type.title}</h4>
                            <p className="text-sm text-gray-600">{type.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Or choose from all post types */}
            <div className="text-center">
              <p className="text-sm font-medium mb-2">Or choose from all post types</p>
              <p className="text-xs text-gray-500">
                Not sure which type to choose? We'll suggest the best option based on your activity.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Restaurant Search */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Restaurant <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search for a restaurant..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowRestaurantResults(e.target.value.length >= 2);
                  }}
                  className="pl-10"
                />
                
                {showRestaurantResults && restaurants && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                    {restaurants.slice(0, 5).map((restaurant: Restaurant) => (
                      <button
                        key={restaurant.id}
                        onClick={() => handleRestaurantSelect(restaurant)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{restaurant.name}</div>
                            {restaurant.location && (
                              <div className="text-sm text-gray-500">{restaurant.location}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= formData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">Select a rating</span>
              </div>
            </div>

            {/* Photos & Videos */}
            <div>
              <label className="block text-sm font-medium mb-2">Photos & Videos</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-blue-600 mb-1">Upload photos or videos of your food experience (optional)</p>
                <p className="text-gray-500 text-sm mb-2">Drag & drop images/videos, or click to select</p>
                <p className="text-xs text-gray-400">Supports: JPG, PNG, GIF, MP4, MOV (Max 10 images, 2 videos)</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Photos help your food moment get more engagement, but they're optional!
              </p>
            </div>

            {/* Dish Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Dish Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Margherita Pizza, Chicken Tikka Masala"
                value={formData.dishName}
                onChange={(e) => setFormData(prev => ({ ...prev, dishName: e.target.value }))}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                placeholder="Describe the dish - ingredients, preparation, presentation..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <p className="text-sm text-gray-500 mb-3">Add tags to help others discover your post</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={formData.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="px-8"
              >
                Create Post
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}