import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Restaurant {
  id?: number;
  googlePlaceId?: string;
  name?: string;
}

interface RatingData {
  id?: number;
  userId: number;
  restaurantId: number;
  ratingValue: string;
  note?: string;
  tags?: string[];
  circleIds?: number[];
  isPrivate?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface CircleScoreData {
  score: number;
  ratingsCount: number;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}

/**
 * STANDARDIZED RESTAURANT QUERIES HOOK
 * - Unified query keys across all components: ['userRating', restaurantId] and ['circleScore', restaurantId] 
 * - Points to new unified Circle Score endpoint with identity resolution
 * - Handles cache invalidation consistently
 * - Supports both database restaurantId and Google Place ID resolution
 */
export function useStandardizedRestaurantQueries(restaurant: Restaurant) {
  const queryClient = useQueryClient();
  const restaurantId = restaurant?.id;
  const googlePlaceId = restaurant?.googlePlaceId;

  // Standardized user rating query - CRITICAL: Always use ['userRating', restaurantId] 
  const userRating = useQuery<RatingData | null>({
    queryKey: ['userRating', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const response = await fetch(`/api/ratings/restaurant/${restaurantId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch user rating');
      }
      return response.json();
    },
    enabled: !!restaurantId,
    staleTime: 30000, // 30 seconds
  });

  // Standardized circle score query - CRITICAL: Always use ['circleScore', restaurantId]
  const circleScore = useQuery<CircleScoreData>({
    queryKey: ['circleScore', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        return { score: 0, ratingsCount: 0, error: 'No restaurant ID' };
      }
      
      console.log('CIRCLE_SCORE_QUERY: Fetching for restaurant', restaurantId);
      
      // Use the new unified endpoint that handles identity resolution
      const response = await fetch(`/api/restaurant/${restaurantId}/circle-score`);
      if (!response.ok) {
        console.warn(`Circle Score endpoint returned ${response.status} for restaurant ${restaurantId}`);
        return { score: 0, ratingsCount: 0, error: `HTTP ${response.status}` };
      }
      
      const data = await response.json();
      console.log('CIRCLE_SCORE_RESPONSE:', data);
      
      return data || { score: 0, ratingsCount: 0 };
    },
    enabled: !!restaurantId,
    staleTime: 180000, // 3 minutes
  });

  // Standardized rating submission mutation with cache invalidation
  const submitRating = useMutation({
    mutationFn: async (ratingData: {
      ratingValue: number;
      note?: string;
      tags?: string[];
      circleIds?: number[];
      isPrivate?: boolean;
    }) => {
      const response = await fetch('/api/ratings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: restaurantId,
          googlePlaceId: googlePlaceId,
          restaurantName: restaurant?.name,
          ...ratingData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit rating');
      }

      return response.json();
    },
    onSuccess: () => {
      console.log('CACHE_INVALIDATION: Rating submitted, invalidating caches');
      
      // CRITICAL: Invalidate both standardized caches immediately
      queryClient.invalidateQueries({ queryKey: ['userRating', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['circleScore', restaurantId] });
      
      // Also invalidate any legacy cache keys that might still exist
      queryClient.invalidateQueries({ queryKey: ['/api/circle-score'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-ratings'] });
    },
  });

  return {
    // Query states
    userRating,
    circleScore,
    
    // Data helpers
    data: {
      userRating: userRating.data,
      circleScore: circleScore.data,
    },
    
    // Loading states
    isLoading: userRating.isLoading || circleScore.isLoading,
    
    // Error states
    hasError: userRating.error || circleScore.error,
    
    // Actions
    submitRating,
    
    // Cache management
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['userRating', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['circleScore', restaurantId] });
    },
  };
}