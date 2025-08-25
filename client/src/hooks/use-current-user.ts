import { useQuery } from '@tanstack/react-query';

interface CurrentUser {
  id: number;
  username: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  favoriteFood?: string;
  favoriteRestaurant?: string;
  preferredCuisines?: string[];
}

export function useCurrentUser() {
  const { data: currentUser, isLoading, error } = useQuery<CurrentUser>({
    queryKey: ['/api/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    currentUser,
    isLoading,
    error,
    isAuthenticated: !!currentUser
  };
}