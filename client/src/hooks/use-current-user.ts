import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

/**
 * Hook to get the current user
 * Returns the authenticated user or null if not authenticated
 */
export function useCurrentUser() {
  const { data: currentUser, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/me"],
  });
  
  return { currentUser, isLoading, error };
}