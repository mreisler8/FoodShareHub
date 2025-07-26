import React, { useState, useCallback, useEffect } from 'react';
import { X, Check, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useRestaurantRatingState } from '@/hooks/useRestaurantRatingState';
import { SmartTagInput } from '@/components/lists/SmartTagInput';
import { DecimalRatingSlider } from '@/components/ratings/DecimalRatingSlider';
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

function QuickRateModal({ isOpen, onClose, restaurant, existingRating }: QuickRateModalProps) {
  // Use enhanced rating state hook
  const { 
    rating: currentRating, 
    isSubmitting, 
    error: ratingError, 
    submitRating, 
    retry 
  } = useRestaurantRatingState(restaurant);
  
  // Form state - Upgraded to 10-point decimal system
  const [rating, setRating] = useState(0.0);
  const [hoveredRating, setHoveredRating] = useState(0.0);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(true);
  const [sharedWithCircle, setSharedWithCircle] = useState(false);
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
        setIsPrivate(source.isPrivate ?? true);
        setSharedWithCircle(source.sharedWithCircle || false);
      } else {
        // Reset form for new rating
        setRating(0.0);
        setNote('');
        setSelectedTags([]);
        setIsPrivate(true);
        setSharedWithCircle(false);
      }
      setShowSuccess(false);
    }
  }, [isOpen, existingRating, currentRating]);

  // Get user's circles for sharing options
  const { data: circles = [] } = useQuery({
    queryKey: ['/api/me/circles'],
    enabled: isOpen
  });

  const circlesArray = Array.isArray(circles) ? circles : [];

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
        sharedWithCircle
      });

      // Show success animation
      setShowSuccess(true);
      
      // Invalidate relevant queries for Circle Score recalculation
      queryClient.invalidateQueries({ queryKey: ['/api/circle-score'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      
      // Close modal after success animation
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 2000);

    } catch (error) {
      // Error handling is done in the hook - don't let it bubble up
      console.error('Rating submission failed:', error);
      // Show fallback toast if hook didn't handle it
      toast({
        title: "Rating failed",
        description: "Please try again in a moment",
        variant: "destructive"
      });
    }
  }, [rating, note, selectedTags, isPrivate, sharedWithCircle, submitRating, queryClient, onClose, toast]);

  // Handle modal close
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

  // Success animation overlay
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Rating Saved!</h3>
          <p className="text-gray-600 text-sm">
            Your {rating.toFixed(1)}/10.0 rating has been saved and will contribute to Circle Score calculations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-rate-modal-title"
      aria-describedby="quick-rate-modal-description"
    >
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <h2 id="quick-rate-modal-title" className="text-lg font-semibold">
              {existingRating ? 'Update Rating' : 'Rate Restaurant'}
            </h2>
            <div id="quick-rate-modal-description" className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="font-medium">{restaurant.name}</span>
              {restaurant.location && (
                <span className="ml-1">• {restaurant.location}</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} aria-label="Close modal">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Error display */}
          {ratingError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div className="flex-1">
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

          {/* 10-Point Decimal Rating */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Rate this restaurant (0.1 - 10.0)
            </Label>
            <DecimalRatingSlider
              value={rating}
              onChange={handleRatingChange}
              onHover={handleRatingHover}
              hoveredValue={hoveredRating}
              size="md"
              className="w-full"
            />
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

          {/* Quick Tags using SmartTagInput with mobile optimization */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Quick tags (max 5)
            </Label>
            <SmartTagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              maxTags={5}
              listTitle=""
              contextRestaurants={[{
                location: restaurant.location || '',
                cuisine: ''
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
            disabled={!isValid || isSubmitting}
            className="w-full"
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
            <p className="text-xs text-red-500 text-center mt-2">
              Please select a rating from 0.1 to 10.0
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickRateModal;