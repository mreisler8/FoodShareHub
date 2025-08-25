import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface TriedItButtonProps {
  entityType: 'list' | 'rating' | 'post';
  entityId: number;
  restaurantId: number;
  recommenderUserId: number;
  sourceContext?: string;
  isAccepted?: boolean;
  onAccepted?: () => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function TriedItButton({
  entityType,
  entityId,
  restaurantId,
  recommenderUserId,
  sourceContext,
  isAccepted = false,
  onAccepted,
  size = 'default',
  variant = 'outline',
  className
}: TriedItButtonProps) {
  const [localAccepted, setLocalAccepted] = useState(isAccepted);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/recommendations/accept', {
        method: 'POST',
        body: JSON.stringify({
          entityType,
          entityId,
          restaurantId,
          recommenderUserId,
          sourceContext: sourceContext || `${entityType}_item`,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onMutate: () => {
      // Optimistic update
      setLocalAccepted(true);
    },
    onSuccess: () => {
      toast({
        title: "Thanks for trying it!",
        description: "Your feedback helps the community discover great places.",
      });
      
      // Invalidate relevant queries to update stats
      queryClient.invalidateQueries({ 
        queryKey: ['/api/recommendations/stats', entityType, entityId.toString()] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/recommendations/impact', recommenderUserId.toString()] 
      });
      
      onAccepted?.();
    },
    onError: (error: any) => {
      // Rollback optimistic update
      setLocalAccepted(isAccepted);
      
      const errorMessage = error.message || "Failed to record that you tried it";
      
      if (error.message?.includes("already accepted")) {
        toast({
          title: "Already recorded",
          description: "You've already marked this as tried.",
          variant: "default",
        });
        setLocalAccepted(true);
      } else if (error.message?.includes("Cannot accept your own")) {
        // Don't show error for own recommendations - button shouldn't be visible
        return;
      } else {
        toast({
          title: "Something went wrong",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  // Don't render if already accepted
  if (localAccepted) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={cn(
          "gap-2 text-green-600 hover:text-green-700 cursor-default",
          size === 'sm' && "h-8 px-2 text-xs",
          size === 'default' && "h-9 px-3 text-sm",
          size === 'lg' && "h-10 px-4",
          className
        )}
        aria-label="You have tried this recommendation"
      >
        <CheckCircle className={cn(
          size === 'sm' && "h-3 w-3",
          size === 'default' && "h-4 w-4",
          size === 'lg' && "h-5 w-5"
        )} />
        Tried It
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => acceptMutation.mutate()}
      disabled={acceptMutation.isPending}
      className={cn(
        "gap-2 transition-all duration-200 hover:scale-105",
        // Ensure minimum 44px touch target for accessibility
        "min-h-[44px] min-w-[44px]",
        size === 'sm' && "h-8 px-2 text-xs",
        size === 'default' && "h-9 px-3 text-sm", 
        size === 'lg' && "h-10 px-4",
        className
      )}
      aria-label={acceptMutation.isPending ? "Recording that you tried it..." : "Mark that you tried this recommendation"}
    >
      {acceptMutation.isPending ? (
        <>
          <Clock className={cn(
            "animate-spin",
            size === 'sm' && "h-3 w-3",
            size === 'default' && "h-4 w-4",
            size === 'lg' && "h-5 w-5"
          )} />
          {size !== 'sm' && "..."}
        </>
      ) : (
        <>
          <CheckCircle className={cn(
            size === 'sm' && "h-3 w-3",
            size === 'default' && "h-4 w-4", 
            size === 'lg' && "h-5 w-5"
          )} />
          {size !== 'sm' && "Tried It"}
        </>
      )}
    </Button>
  );
}