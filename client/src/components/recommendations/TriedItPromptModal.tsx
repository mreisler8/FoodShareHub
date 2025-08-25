import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, SkipForward } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface TriedItPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: number;
  restaurantName: string;
  entityType: 'list' | 'rating' | 'post';
  entityId: number;
  recommenderUserId: number;
  sourceContext?: string;
}

export function TriedItPromptModal({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  entityType,
  entityId,
  recommenderUserId,
  sourceContext
}: TriedItPromptModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateAcceptanceMutation = useMutation({
    mutationFn: async ({ ratingValue, notes }: { ratingValue?: number; notes?: string }) => {
      return apiRequest('/api/recommendations/accept', {
        method: 'POST',
        body: JSON.stringify({
          entityType,
          entityId,
          restaurantId,
          recommenderUserId,
          sourceContext: sourceContext || `${entityType}_item`,
          ratingValue,
          notes: notes || undefined,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries to update stats
      queryClient.invalidateQueries({ 
        queryKey: ['/api/recommendations/stats', entityType, entityId.toString()] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/recommendations/impact', recommenderUserId.toString()] 
      });
      
      toast({
        title: rating > 0 ? "Thanks for rating!" : "Thanks for trying it!",
        description: rating > 0 
          ? "Your rating helps others discover great places." 
          : "Your feedback helps the community.",
      });
      
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to save your feedback";
      
      if (error.message?.includes("already accepted")) {
        toast({
          title: "Already recorded",
          description: "You've already marked this as tried.",
          variant: "default",
        });
        handleClose();
      } else {
        toast({
          title: "Something went wrong",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setNotes('');
    onClose();
  };

  const handleSkip = () => {
    updateAcceptanceMutation.mutate({});
  };

  const handleRateAndShare = () => {
    if (rating === 0) {
      toast({
        title: "Please add a rating",
        description: "Select how many stars you'd give this place.",
        variant: "destructive",
      });
      return;
    }
    
    updateAcceptanceMutation.mutate({
      ratingValue: rating,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            How was {restaurantName}?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Stars */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Rate your experience to help others
            </p>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={cn(
                    "text-3xl transition-all duration-150 hover:scale-110",
                    (hoveredRating >= star || rating >= star)
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-yellow-200"
                  )}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star className="w-8 h-8" fill="currentColor" />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-500">
                {rating === 1 && "Not great"}
                {rating === 2 && "It was okay"}
                {rating === 3 && "Pretty good"}
                {rating === 4 && "Really good"}
                {rating === 5 && "Amazing!"}
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              What did you think? (optional)
            </label>
            <Textarea
              id="notes"
              placeholder="Share your thoughts about the food, service, atmosphere..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {notes.length}/200 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={updateAcceptanceMutation.isPending}
              className="flex-1 gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Skip for now
            </Button>
            
            <Button
              onClick={handleRateAndShare}
              disabled={updateAcceptanceMutation.isPending || rating === 0}
              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
            >
              <Star className="h-4 w-4" />
              {updateAcceptanceMutation.isPending ? "Saving..." : "Rate & Share"}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Your feedback helps improve recommendations for the community
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}