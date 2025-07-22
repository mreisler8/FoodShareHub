import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";

interface UserRating {
  ratingValue: number;
  note?: string;
  tags?: string[];
  createdAt?: string;
}

export function useRestaurantRatingState(restaurantId: string) {
  const { user } = useAuth();
  const [rating, setRating] = useState<UserRating | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRating() {
      if (!user?.id || !restaurantId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/ratings/restaurant/${restaurantId}`, {
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
  }, [user?.id, restaurantId]);

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