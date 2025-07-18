import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, ArrowLeft, Star, Upload } from 'lucide-react';
import { RestaurantSearchInput } from './RestaurantSearchInput';
import { postService } from '@/services/postService';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postType: string;
}

export function CreatePostModal({ open, onOpenChange, postType }: CreatePostModalProps) {
  const [formData, setFormData] = useState({
    restaurant: null,
    rating: 0,
    dishName: '',
    category: '',
    description: '',
    media: null as File | null,
    tasteNotes: [] as string[]
  });

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

  const handleSubmit = async () => {
    if (!formData.restaurant || !formData.rating || !formData.dishName.trim()) {
      return;
    }

    try {
      const postData = {
        restaurantId: formData.restaurant.id,
        content: formData.description || `${formData.dishName} - ${formData.tasteNotes.join(', ')}`,
        rating: formData.rating,
        visibility: {
          public: true,
          followers: false,
          circleIds: []
        },
        dishesTried: [formData.dishName],
        tags: formData.tasteNotes,
        postType: 'dish' as const,
        metadata: {
          dishName: formData.dishName,
          category: formData.category,
          tasteNotes: formData.tasteNotes
        }
      };

      await postService.createPost(postData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-orange-500">🍕</span>
                Create Your Post
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

        <div className="space-y-6">
          {/* Restaurant Search */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Restaurant <span className="text-red-500">*</span>
            </label>
            <RestaurantSearchInput
              onSelect={(restaurant) => setFormData(prev => ({ ...prev, restaurant }))}
              placeholder="Search for a restaurant..."
              value={formData.restaurant}
            />
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
  );
}