import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";

interface UserRating {
  ratingValue: number;
  note?: string;
  tags?: string[];
  createdAt?: string;
}

/**
 * UNIVERSAL RATING STATE HOOK
 * Works with any restaurant from any source (search, database, Google Places)
 */
export function useRestaurantRatingState(restaurant: any) {
  const { user } = useAuth();
  const [rating, setRating] = useState<UserRating | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRating() {
      if (!user?.id || !restaurant) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Universal endpoint determination
        let endpoint: string;
        if (restaurant.id && typeof restaurant.id === 'number') {
          // Database restaurant
          endpoint = `/api/ratings/restaurant/${restaurant.id}?type=database`;
        } else if (restaurant.googlePlaceId) {
          // Google Places restaurant
          endpoint = `/api/ratings/restaurant/${encodeURIComponent(restaurant.googlePlaceId)}?type=google_place`;
        } else if (typeof restaurant.id === 'string' && restaurant.id.startsWith('ChIJ')) {
          // Google Place ID as string
          endpoint = `/api/ratings/restaurant/${encodeURIComponent(restaurant.id)}?type=google_place`;
        } else {
          console.warn('Cannot determine rating endpoint for restaurant:', restaurant);
          setRating(null);
          return;
        }
        
        console.log('UNIVERSAL Rating fetch:', {
          restaurantName: restaurant.name,
          endpoint,
          hasDbId: !!restaurant.id,
          hasGoogleId: !!restaurant.googlePlaceId
        });
        
        const response = await fetch(endpoint, {
          credentials: 'include'
        });
        
        if (response.status === 404) {
          // No rating found - this is expected for unrated restaurants
          setRating(null);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch user rating');
        }
        
        const data = await response.json();
        setRating(data);
      } catch (err) {
        console.error('Error fetching user rating:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch rating');
        setRating(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRating();
  }, [user?.id, restaurant?.id, restaurant?.googlePlaceId, restaurant?.name]);

  const updateRating = (newRating: UserRating) => {
    setRating(newRating);
  };

  return {
    rating,
    setRating: updateRating,
    isLoading,
    error,
    hasRated: rating !== null,
    ratingValue: rating?.ratingValue || null,
    label: rating?.ratingValue ? `Rated ${rating.ratingValue}⭐` : "Quick Rate",
  };
}