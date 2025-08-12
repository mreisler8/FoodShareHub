import { useQuery } from '@tanstack/react-query';

interface Restaurant {
  id?: number;
  googlePlaceId?: string;
  name?: string;
}

export function useRestaurantRatings(restaurant: Restaurant) {
  const restaurantId = restaurant?.id;
  const googlePlaceId = restaurant?.googlePlaceId;
  
  // Unified user rating query with standardized key
  const userRating = useQuery({
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

  // Unified circle score query with standardized key  
  const circleScore = useQuery({
    queryKey: ['circleScore', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return { score: 0, ratingsCount: 0 };
      
      const response = await fetch(`/api/restaurant/${restaurantId}/circle-score`);
      if (!response.ok) {
        console.warn(`Circle Score endpoint not available for restaurant ${restaurantId}`);
        return { score: 0, ratingsCount: 0, error: 'Endpoint not available' };
      }
      return response.json();
    },
    enabled: !!restaurantId,
    staleTime: 180000, // 3 minutes 
  });

  // Optional: All ratings for this restaurant (if needed for lists/details)
  const allRatings = useQuery({
    queryKey: ['ratings', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const response = await fetch(`/api/ratings?restaurantId=${restaurantId}`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch restaurant ratings');
      }
      return response.json();
    },
    enabled: !!restaurantId,
    staleTime: 60000, // 1 minute
  });

  return {
    userRating,
    circleScore,
    allRatings,
    // Helper for components that need the data directly
    data: {
      userRating: userRating.data,
      circleScore: circleScore.data,
      allRatings: allRatings.data,
    },
    // Helper for loading states
    isLoading: userRating.isLoading || circleScore.isLoading,
    // Helper for any errors
    hasError: userRating.error || circleScore.error || allRatings.error,
  };
}