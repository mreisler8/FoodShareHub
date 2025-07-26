
import React, { useState, useCallback, useEffect } from 'react';
import { X, Check, MapPin, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useRestaurantRatingState } from '@/hooks/useRestaurantRatingState';
import { SmartTagInput } from '@/components/lists/SmartTagInput';
import { DecimalRatingSlider } from '@/components/ratings/DecimalRatingSlider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

function QuickRateModal({ isOpen, onClose, restaurant, existingRating }: QuickRateModalProps) {
  const { 
    rating: currentRating, 
    isSubmitting, 
    error: ratingError, 
    submitRating, 
    retry 
  } = useRestaurantRatingState(restaurant);

  // Form state
  const [rating, setRating] = useState(0.0);
  const [hoveredRating, setHoveredRating] = useState(0.0);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize form with existing rating
  useEffect(() => {
    if (isOpen) {
      const source = existingRating || currentRating;
      if (source) {
        setRating(parseFloat(source.ratingValue) || 0.0);
        setNote(source.note || '');
        setSelectedTags(source.tags || []);
        setIsPrivate(source.isPrivate ?? false);
      } else {
        setRating(0.0);
        setNote('');
        setSelectedTags([]);
        setIsPrivate(false);
      }
      setShowSuccess(false);
    }
  }, [isOpen, existingRating, currentRating]);

  // Handle rating submission
  const handleSubmit = useCallback(async () => {
    if (rating < 0.1) {
      toast({
        title: "Please select a rating",
        description: "Choose a rating from 0.1 to 10.0.",
        variant: "destructive"
      });
      return;
    }

    try {
      await submitRating({
        ratingValue: rating,
        note: note.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        isPrivate,
        sharedWithCircle: false
      });

      // Show success animation
      setShowSuccess(true);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/circle-score'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });

      // Close modal after success animation
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);

    } catch (error) {
      console.error('Rating submission failed:', error);
      toast({
        title: "Rating failed",
        description: "Please try again in a moment",
        variant: "destructive"
      });
    }
  }, [rating, note, selectedTags, isPrivate, submitRating, queryClient, onClose, toast]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  const handleRatingChange = useCallback((newRating: number) => {
    setRating(newRating);
  }, []);

  const handleRatingHover = useCallback((hoverRating: number) => {
    setHoveredRating(hoverRating);
  }, []);

  const isValid = rating >= 0.1;

  if (!isOpen) return null;

  // Success state
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900">Rating Saved!</h3>
          <p className="text-gray-600 text-sm">
            Your {rating.toFixed(1)}/10 rating has been saved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {existingRating ? 'Update Rating' : 'Rate Restaurant'}
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="font-medium truncate">{restaurant.name}</span>
              {restaurant.location && (
                <span className="ml-1 text-gray-400">• {restaurant.location}</span>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose} 
            className="ml-2 h-8 w-8 p-0 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error display */}
          {ratingError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700">{ratingError.message}</p>
                {ratingError.retryable && (
                  <button
                    onClick={retry}
                    className="text-sm text-red-600 underline hover:no-underline mt-1"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Rating Section */}
          <div className="space-y-4">
            <div className="text-center">
              <Label className="text-base font-medium text-gray-900 block mb-2">
                Your Rating
              </Label>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                <Star className="h-4 w-4" />
                <span>0.1 - 10.0 scale</span>
              </div>
            </div>
            <DecimalRatingSlider
              value={rating}
              onChange={handleRatingChange}
              onHover={handleRatingHover}
              hoveredValue={hoveredRating}
              size="lg"
              className="w-full"
            />
            {rating > 0 && (
              <div className="text-center">
                <span className="text-2xl font-bold text-gray-900">
                  {rating.toFixed(1)}
                </span>
                <span className="text-gray-500 ml-1">/ 10.0</span>
              </div>
            )}
          </div>

          {/* Note Section */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium text-gray-700">
              Add a note (optional)
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What made this visit special?"
              maxLength={140}
              className="resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
            <div className="text-xs text-gray-400 text-right">
              {note.length}/140
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Tags (optional)
            </Label>
            <SmartTagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              maxTags={3}
              listTitle=""
              contextRestaurants={[{
                location: restaurant.location || '',
                cuisine: ''
              }]}
            />
          </div>

          {/* Privacy Section */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="private-toggle" className="text-sm font-medium text-gray-700">
                  Keep private
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Only you will see this rating
                </p>
              </div>
              <Switch
                id="private-toggle"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : existingRating ? (
              "Update Rating"
            ) : (
              "Submit Rating"
            )}
          </Button>
          {!isValid && (
            <p className="text-xs text-red-500 text-center mt-3">
              Please select a rating from 0.1 to 10.0
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickRateModal;
