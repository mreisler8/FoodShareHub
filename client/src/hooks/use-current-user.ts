import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useCurrentUser() {
  const { data: currentUser, isLoading, error } = useQuery<User>({
    queryKey: ["/api/me"],
  });

  return {
    currentUser,
    isLoading,
    error,
    isAuthenticated: !!currentUser,
  };
}
