import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, ArrowLeft, Star, Upload } from 'lucide-react';
import { UnifiedSearchModal } from '@/components/search/UnifiedSearchModal';
import { postService } from '@/services/postService';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Restaurant } from '@/types/restaurant';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postType: string;
}

export function CreatePostModal({ open, onOpenChange, postType }: CreatePostModalProps) {
  const [formData, setFormData] = useState({
    restaurant: null as Restaurant | null,
    rating: 0,
    dishName: '',
    category: '',
    description: '',
    media: null as File | null,
    tasteNotes: [] as string[]
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tasteOptions = [
    'Sweet', 'Salty', 'Spicy', 'Sour', 'Bitter', 'Umami', 'Crispy', 'Creamy', 'Tender'
  ];

  const categories = [
    'Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Salad', 'Soup', 'Pasta', 'Pizza', 'Burger', 'Sushi'
  ];

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleTasteNoteToggle = (note: string) => {
    setFormData(prev => ({
      ...prev,
      tasteNotes: prev.tasteNotes.includes(note)
        ? prev.tasteNotes.filter(n => n !== note)
        : [...prev.tasteNotes, note]
    }));
  };

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!formData.restaurant || !formData.rating || !formData.dishName.trim()) {
        throw new Error('Restaurant, rating, and dish name are required');
      }

      // Use the centralized postService.processPostData for consistency
      const processedData = postService.processPostData({
        liked: formData.description || `${formData.dishName} - ${formData.tasteNotes.join(', ')}`,
        disliked: '',
        notes: '',
        rating: formData.rating,
        dishesTried: [formData.dishName],
        tags: formData.tasteNotes,
        visibilitySettings: {
          public: true,
          followers: false,
          circleIds: []
        },
        imageUrls: [],
        videoUrls: [],
        imageTags: [],
        priceAssessment: null,
        atmosphere: null,
        serviceRating: null,
        dietaryOptions: [],
        restaurant: formData.restaurant
      });

      // Add post-specific metadata
      processedData.postType = 'dish';
      processedData.metadata = {
        dishName: formData.dishName,
        category: formData.category,
        tasteNotes: formData.tasteNotes
      };

      return await postService.createPost(processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: 'Post created successfully',
        description: 'Your dining experience has been shared!',
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating post',
        description: error.message || 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      restaurant: null as Restaurant | null,
      rating: 0,
      dishName: '',
      category: '',
      description: '',
      media: null as File | null,
      tasteNotes: [] as string[]
    });
  };

  const handleSubmit = () => {
    createPostMutation.mutate();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-orange-500">🍕</span>
            Create Your Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Restaurant Search */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Restaurant <span className="text-red-500">*</span>
            </label>
            {!formData.restaurant ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setSearchModalOpen(true)}
              >
                <Star className="h-4 w-4 mr-2" />
                Search for a restaurant...
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{formData.restaurant.name}</p>
                  {formData.restaurant.location && (
                    <p className="text-sm text-gray-500">{formData.restaurant.location}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, restaurant: null }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
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
              {formData.rating > 0 && (
                <span className="ml-2 text-sm text-gray-600">
                  Select a rating
                </span>
              )}
            </div>
          </div>

          {/* Photos & Videos */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Photos & Videos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <div className="text-sm">
                  <p className="text-blue-600">Upload photos or videos of your food experience (optional)</p>
                  <p className="text-gray-500">Drag & drop images/videos, or click to select</p>
                </div>
                <div className="text-xs text-gray-400">
                  Supports: JPG, PNG, GIF, MP4, MOV (Max 10 images, 2 videos)
                </div>
              </div>
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
            <label className="block text-sm font-medium mb-2">
              Category
            </label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
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
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <Textarea
              placeholder="Describe the dish - ingredients, preparation, presentation..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
          </div>

          

          {/* Taste Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Taste Notes
            </label>
            <div className="flex flex-wrap gap-2">
              {tasteOptions.map((note) => (
                <Badge
                  key={note}
                  variant={formData.tasteNotes.includes(note) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleTasteNoteToggle(note)}
                >
                  {note}
                </Badge>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!formData.restaurant || !formData.rating || !formData.dishName.trim()}
              className="px-8"
            >
              Create Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <OptimizedSearchModal
      open={searchModalOpen}
      onOpenChange={setSearchModalOpen}
      searchType="restaurants"
      showLocationServices={true}
      placeholder="Search for a restaurant..."
      onSelect={(result) => {
        setFormData(prev => ({ 
          ...prev, 
          restaurant: {
            id: result.id,
            name: result.name,
            location: result.location || result.subtitle,
            address: result.location,
            avgRating: result.avgRating
          }
        }));
        setSearchModalOpen(false);
      }}
    />
    </>
  );
}