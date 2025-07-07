import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

interface Restaurant {
  id: number;
  name: string;
  location: string;
  category: string;
  priceRange: string;
  imageUrl?: string;
}

export function useRestaurantSearch(searchTerm: string) {
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  return useQuery<Restaurant[]>({
    queryKey: ['/api/search', debouncedSearchTerm],
    enabled: debouncedSearchTerm.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}