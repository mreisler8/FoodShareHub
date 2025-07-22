import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";

interface UserRating {
  ratingValue: number;
  note?: string;
  tags?: string[];
  createdAt?: string;
}

interface RestaurantIdentifier {
  id?: number;
  googlePlaceId?: string;
  name?: string;
}

function getRatingEndpoint(identifier: string | RestaurantIdentifier): string {
  // Handle string input (from URL params)
  if (typeof identifier === 'string') {
    // Google Place IDs typically start with 'ChIJ' or are longer than 10 chars
    if (identifier.startsWith('ChIJ') || identifier.length > 10) {
      return `/api/ratings/restaurant/${encodeURIComponent(identifier)}?type=google_place`;
    } else {
      // Assume database ID
      return `/api/ratings/restaurant/${identifier}?type=database`;
    }
  }
  
  // Handle object input (restaurant data)
  if (identifier.googlePlaceId) {
    return `/api/ratings/restaurant/${encodeURIComponent(identifier.googlePlaceId)}?type=google_place`;
  } else if (identifier.id) {
    return `/api/ratings/restaurant/${identifier.id}?type=database`;
  }
  
  throw new Error('Invalid restaurant identifier');
}

export function useRestaurantRatingState(restaurantIdentifier: string | RestaurantIdentifier) {
  const { user } = useAuth();
  const [rating, setRating] = useState<UserRating | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRating() {
      if (!user?.id || !restaurantIdentifier) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const endpoint = getRatingEndpoint(restaurantIdentifier);
        console.log('Fetching rating from endpoint:', endpoint);
        
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
  }, [user?.id, restaurantIdentifier]);

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