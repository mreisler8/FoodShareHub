import { useQuery } from '@tanstack/react-query';
import type { CircleScoreData } from '@/components/circle-score/CircleScoreCard';

interface UseCircleScoreOptions {
  restaurantId?: number;
  googlePlaceId?: string;
  enabled?: boolean;
}

export function useCircleScore({ 
  restaurantId, 
  googlePlaceId, 
  enabled = true 
}: UseCircleScoreOptions) {
  const queryKey = googlePlaceId 
    ? ['/api/circle-score', googlePlaceId, 'google_place']
    : ['/api/circle-score', restaurantId, 'restaurant'];
    
  return useQuery<CircleScoreData | null>({
    queryKey,
    enabled: enabled && (!!restaurantId || !!googlePlaceId),
    queryFn: async () => {
      let url: string;
      
      if (googlePlaceId) {
        url = `/api/circle-score/${encodeURIComponent(googlePlaceId)}?type=google_place`;
      } else if (restaurantId) {
        url = `/api/circle-score/${restaurantId}?type=restaurant`;
      } else {
        throw new Error('Either restaurantId or googlePlaceId must be provided');
      }
      
      const response = await fetch(url);
      
      // Handle 404 responses gracefully (not an error - just no data)
      if (response.status === 404) {
        return null; // No circle score available - this is expected and not an error
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch Circle Score');
      }
      
      const data = await response.json();
      return data || null; // Ensure we return null for falsy data
    },
    // Stale time of 5 minutes for circle scores
    staleTime: 5 * 60 * 1000,
    // GC time of 10 minutes (TanStack Query v5 uses gcTime instead of cacheTime)
    gcTime: 10 * 60 * 1000,
  });
}

export function useBatchCircleScores(restaurants: Array<{id: string | number, type?: 'restaurant' | 'google_place'}>) {
  return useQuery<Record<string, CircleScoreData | null>>({
    queryKey: ['/api/circle-score/batch', restaurants],
    enabled: restaurants.length > 0,
    queryFn: async () => {
      const response = await fetch('/api/circle-score/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurants }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch batch Circle Scores');
      }
      
      return response.json();
    },
    // Stale time of 5 minutes for batch scores
    staleTime: 5 * 60 * 1000,
    // GC time of 10 minutes (TanStack Query v5 uses gcTime instead of cacheTime)
    gcTime: 10 * 60 * 1000,
  });
}