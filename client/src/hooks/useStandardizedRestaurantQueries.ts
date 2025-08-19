
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCanonicalRestaurantId, getRatingEndpoint, getCircleScoreEndpoint } from '../../../server/lib/restaurantIdUtils';

interface RestaurantParams {
  googlePlaceId: string;
  name?: string;
}

export function useStandardizedRestaurantQueries(params: RestaurantParams) {
  const queryClient = useQueryClient();
  
  // STABLE: Always use Google Place ID as canonical identifier
  const canonicalId = params.googlePlaceId;
  const restaurantName = params.name || 'Restaurant';

  // STABLE HOOK 1: User Rating - always called with same parameters
  const userRating = useQuery({
    queryKey: ['userRating', canonicalId],
    queryFn: async () => {
      const response = await fetch(`/api/ratings/restaurant/${encodeURIComponent(canonicalId)}?type=google_place`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch user rating');
      }
      return response.json();
    },
    enabled: !!canonicalId,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  // STABLE HOOK 2: Circle Score - always called with same parameters  
  const circleScore = useQuery({
    queryKey: ['circleScore', canonicalId],
    queryFn: async () => {
      const response = await fetch(`/api/circle-score/${encodeURIComponent(canonicalId)}?type=google_place`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch circle score');
      }
      return response.json();
    },
    enabled: !!canonicalId,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  // STABLE HOOK 3: Submit Rating Mutation - always called
  const submitRating = useMutation({
    mutationFn: async (ratingData: { ratingValue: number; note?: string; tags?: string[]; isPrivate?: boolean }) => {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          googlePlaceId: canonicalId,
          restaurantName: restaurantName,
          ...ratingData
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit rating');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries using stable keys
      queryClient.invalidateQueries({ queryKey: ['userRating', canonicalId] });
      queryClient.invalidateQueries({ queryKey: ['circleScore', canonicalId] });
    }
  });

  // Return stable data structure
  return {
    userRating: userRating.data,
    circleScore: circleScore.data,
    isLoading: userRating.isLoading || circleScore.isLoading,
    submitRating: submitRating.mutate,
    data: {
      userRating: userRating.data,
      circleScore: circleScore.data
    }
  };
}
