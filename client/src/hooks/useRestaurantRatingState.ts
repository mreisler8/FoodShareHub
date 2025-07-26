import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

interface UserRating {
  id?: number;
  ratingValue: number;
  note?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface RatingError {
  type: 'network' | 'validation' | 'auth' | 'server';
  message: string;
  retryable: boolean;
}

/**
 * ENHANCED UNIVERSAL RATING STATE HOOK
 * - Optimistic updates for immediate UI feedback
 * - Retry logic for failed submissions
 * - Better error handling with specific error types
 * - Success feedback integration
 */
export function useRestaurantRatingState(restaurant: any) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState<UserRating | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<RatingError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced rating fetch with better error handling
  const fetchRating = useCallback(async () => {
    if (!user?.id || !restaurant) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Universal endpoint determination with validation
      let endpoint: string;
      if (restaurant.id && typeof restaurant.id === 'number') {
        endpoint = `/api/ratings/restaurant/${restaurant.id}?type=database`;
      } else if (restaurant.googlePlaceId) {
        endpoint = `/api/ratings/restaurant/${encodeURIComponent(restaurant.googlePlaceId)}?type=google_place`;
      } else if (typeof restaurant.id === 'string' && restaurant.id.startsWith('ChIJ')) {
        endpoint = `/api/ratings/restaurant/${encodeURIComponent(restaurant.id)}?type=google_place`;
      } else {
        throw new Error('Invalid restaurant identifier - cannot fetch rating');
      }
      
      console.log('🔄 Fetching rating:', {
        restaurant: restaurant.name,
        endpoint,
        user: user.id
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(endpoint, {
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 404) {
        setRating(null);
        return;
      }
      
      if (response.status === 401) {
        setError({
          type: 'auth',
          message: 'Please log in to view your rating',
          retryable: false
        });
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      setRating(data);
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error('Error fetching rating:', err);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError({
            type: 'network',
            message: 'Request timed out. Please check your connection.',
            retryable: true
          });
        } else if (err.message.includes('fetch')) {
          setError({
            type: 'network',
            message: 'Network error. Please check your connection.',
            retryable: true
          });
        } else {
          setError({
            type: 'server',
            message: err.message,
            retryable: true
          });
        }
      } else {
        setError({
          type: 'server',
          message: 'Unknown error occurred',
          retryable: true
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, restaurant?.id, restaurant?.googlePlaceId, restaurant?.name]);

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  // Optimistic rating update with retry logic
  const submitRating = useCallback(async (ratingData: {
    ratingValue: number;
    note?: string;
    tags?: string[];
    isPrivate?: boolean;
    sharedWithCircle?: boolean;
  }) => {
    if (!user?.id || !restaurant) {
      throw new Error('User not authenticated or invalid restaurant');
    }

    setIsSubmitting(true);
    setError(null);

    // Optimistic update
    const optimisticRating: UserRating = {
      ...ratingData,
      id: rating?.id,
      createdAt: rating?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const previousRating = rating;
    setRating(optimisticRating);

    try {
      // Extract universal restaurant data
      const universalData = {
        ...ratingData,
        restaurantId: restaurant.id && typeof restaurant.id === 'number' ? restaurant.id : null,
        googlePlaceId: restaurant.googlePlaceId || (typeof restaurant.id === 'string' ? restaurant.id : null),
        restaurantName: restaurant.name || 'Unknown Restaurant'
      };

      console.log('💾 Submitting rating:', universalData);

      const endpoint = rating?.id ? '/api/ratings' : '/api/ratings';
      const method = rating?.id ? 'PUT' : 'POST';
      
      if (method === 'PUT' && rating?.id) {
        universalData.id = rating.id;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(universalData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${method === 'PUT' ? 'update' : 'create'} rating`);
      }

      const savedRating = await response.json();
      setRating(savedRating);
      setRetryCount(0);

      // Success feedback
      toast({
        title: "Rating saved!",
        description: `Your ${savedRating.ratingValue}/10.0 rating has been saved and will contribute to Circle Score calculations.`
      });

      return savedRating;

    } catch (err) {
      console.error('Error submitting rating:', err);
      
      // Revert optimistic update
      setRating(previousRating);
      
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError({
            type: 'network',
            message: 'Network error. Please check your connection.',
            retryable: true
          });
        } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setError({
            type: 'auth',
            message: 'Please log in to rate restaurants',
            retryable: false
          });
        } else {
          setError({
            type: 'server',
            message: err.message,
            retryable: true
          });
        }
      } else {
        setError({
          type: 'server',
          message: 'Unknown error occurred',
          retryable: true
        });
      }
      
      // Show error toast but don't throw - handle gracefully
      toast({
        title: "Failed to save rating",
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: "destructive"
      });
      
      // Don't throw - let the component continue functioning
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, restaurant, rating, toast]);

  // Retry function for failed operations
  const retry = useCallback(async () => {
    if (retryCount >= 3) {
      toast({
        title: "Maximum retries exceeded",
        description: "Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    setRetryCount(prev => prev + 1);
    
    if (error?.type === 'network' || error?.type === 'server') {
      await fetchRating();
    }
  }, [retryCount, error, fetchRating, toast]);

  // Computed properties for easier use in components
  const hasRated = rating !== null;
  const label = hasRated ? `Rated ${rating.ratingValue}⭐` : 'Quick Rate';

  return {
    rating,
    hasRated,
    label,
    isLoading,
    isSubmitting,
    error,
    submitRating,
    retry,
    refetch: fetchRating
  };
}