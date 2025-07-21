import React, { useState, useCallback } from 'react';
import { X, Star, Check, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { SmartTagInput } from '@/components/lists/SmartTagInput';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface QuickRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: {
    id?: number;
    googlePlaceId?: string;
    name: string;
    location?: string;
    address?: string;
  };
  existingRating?: any;
}

// Using SmartTagInput component for consistency with list creation

export default function QuickRateModal({ isOpen, onClose, restaurant, existingRating }: QuickRateModalProps) {
  const [rating, setRating] = useState(existingRating?.ratingValue || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [note, setNote] = useState(existingRating?.note || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(existingRating?.tags || []);
  const [isPrivate, setIsPrivate] = useState(existingRating?.isPrivate ?? true);
  const [sharedWithCircle, setSharedWithCircle] = useState(existingRating?.sharedWithCircle || false);
  
  const queryClient = useQueryClient();

  // Get user's circles for sharing options
  const { data: circles = [] } = useQuery({
    queryKey: ['/api/me/circles'],
    enabled: isOpen
  });

  const circlesArray = Array.isArray(circles) ? circles : [];

  const createRatingMutation = useMutation({
    mutationFn: async (ratingData: any) => {
      return apiRequest('/api/ratings', {
        method: 'POST',
        body: JSON.stringify(ratingData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings/restaurant'] });
      onClose();
    }
  });

  const updateRatingMutation = useMutation({
    mutationFn: async (ratingData: any) => {
      return apiRequest(`/api/ratings/${existingRating.id}`, {
        method: 'PUT',
        body: JSON.stringify(ratingData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings/restaurant'] });
      onClose();
    }
  });

  const handleStarClick = useCallback((starRating: number) => {
    setRating(starRating);
  }, []);

  const handleStarHover = useCallback((starRating: number) => {
    setHoveredRating(starRating);
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag].slice(0, 5) // Max 5 tags
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;

    const ratingData = {
      restaurantId: restaurant.id || null,
      googlePlaceId: restaurant.googlePlaceId || null,
      restaurantName: restaurant.name,
      ratingValue: rating,
      note: note.trim() || null,
      tags: selectedTags,
      isPrivate,
      sharedWithCircle,
      circleIds: sharedWithCircle && circlesArray.length > 0 ? [circlesArray[0].id] : []
    };

    try {
      if (existingRating) {
        await updateRatingMutation.mutateAsync(ratingData);
      } else {
        await createRatingMutation.mutateAsync(ratingData);
      }
    } catch (error) {
      console.error('Rating submission error:', error);
    }
  }, [rating, restaurant, note, selectedTags, isPrivate, sharedWithCircle, circlesArray, existingRating, createRatingMutation, updateRatingMutation]);

  const isValid = rating > 0;
  const isLoading = createRatingMutation.isPending || updateRatingMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {existingRating ? 'Update Rating' : 'Rate Restaurant'}
            </h2>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="font-medium">{restaurant.name}</span>
              {restaurant.location && (
                <span className="ml-1">• {restaurant.location}</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Star Rating */}
          <div className="text-center">
            <div className="flex justify-center space-x-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => handleStarClick(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      (hoveredRating >= star || (hoveredRating === 0 && rating >= star))
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Great"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note" className="text-sm font-medium">
              Add a note (optional)
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share what made this visit special..."
              maxLength={140}
              className="mt-1 resize-none"
              rows={2}
            />
            <div className="text-xs text-gray-500 mt-1">
              {note.length}/140 characters
            </div>
          </div>

          {/* Quick Tags using SmartTagInput */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Quick tags (max 5)
            </Label>
            <SmartTagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              maxTags={5}
              listTitle="" // Empty since this is for ratings, not lists
              contextRestaurants={[{
                location: restaurant.location || '',
                cuisine: '' // Restaurant cuisine would be ideal here
              }]}
            />
          </div>

          {/* Privacy Controls */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="private-toggle" className="text-sm">
                Keep private
              </Label>
              <Switch
                id="private-toggle"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>

            {!isPrivate && circlesArray.length > 0 && (
              <div className="flex items-center justify-between">
                <Label htmlFor="circle-toggle" className="text-sm">
                  Share with circles
                </Label>
                <Switch
                  id="circle-toggle"
                  checked={sharedWithCircle}
                  onCheckedChange={setSharedWithCircle}
                />
              </div>
            )}

            {!isPrivate && (
              <p className="text-xs text-gray-600">
                {sharedWithCircle 
                  ? "This rating will be visible to your circles and followers"
                  : "This rating will be visible to your followers"
                }
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="w-full"
          >
            {isLoading ? (
              "Submitting..."
            ) : existingRating ? (
              "Update Rating"
            ) : (
              "Submit Rating"
            )}
          </Button>
          {!isValid && (
            <p className="text-xs text-red-500 text-center mt-2">
              Please select a star rating
            </p>
          )}
        </div>
      </div>
    </div>
  );
}