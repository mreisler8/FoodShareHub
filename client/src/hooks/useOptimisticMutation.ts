import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: string | string[];
  optimisticUpdate?: (oldData: any, variables: TVariables) => any;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Enhanced mutation hook with optimistic updates and comprehensive error handling
 * Provides best-in-class UX for social actions like follow, save, share
 */
export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  onSuccess,
  onError,
  successMessage,
  errorMessage,
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(Array.isArray(queryKey) ? queryKey : [queryKey]);

      // Optimistically update
      if (optimisticUpdate && previousData) {
        queryClient.setQueryData(
          Array.isArray(queryKey) ? queryKey : [queryKey],
          optimisticUpdate(previousData, variables)
        );
      }

      // Return context for rollback
      return { previousData };
    },
    onSuccess: (data: TData, variables: TVariables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
      
      if (successMessage) {
        toast({
          title: "Success!",
          description: successMessage,
        });
      }

      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: TVariables, context: any) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(
          Array.isArray(queryKey) ? queryKey : [queryKey],
          context.previousData
        );
      }

      toast({
        title: "Error",
        description: errorMessage || error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });

      onError?.(error, variables);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
    },
  });
}

/**
 * Specialized hook for follow/unfollow actions
 */
export function useFollowMutation(userId: string) {
  return useOptimisticMutation({
    mutationFn: async ({ action }: { action: 'follow' | 'unfollow' }) => {
      const response = await fetch(`/api/follow/${userId}`, {
        method: action === 'follow' ? 'POST' : 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }
      
      return response.json();
    },
    queryKey: ['/api/follow/status', userId],
    optimisticUpdate: (oldData: any, { action }) => ({
      ...oldData,
      isFollowing: action === 'follow',
      followerCount: oldData.followerCount + (action === 'follow' ? 1 : -1),
    }),
    successMessage: undefined, // No toast for follow actions to avoid spam
  });
}

/**
 * Specialized hook for save/unsave actions
 */
export function useSaveMutation(contentType: 'list' | 'post', contentId: string) {
  return useOptimisticMutation({
    mutationFn: async ({ action }: { action: 'save' | 'unsave' }) => {
      const response = await fetch(`/api/saved-${contentType}s/${contentId}`, {
        method: action === 'save' ? 'POST' : 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} ${contentType}`);
      }
      
      return response.json();
    },
    queryKey: [`/api/saved-${contentType}s/${contentId}/status`],
    optimisticUpdate: (oldData: any, { action }) => ({
      ...oldData,
      isSaved: action === 'save',
    }),
    successMessage: undefined, // No toast for save actions
  });
}

/**
 * Specialized hook for reaction actions (like, love, etc.)
 */
export function useReactionMutation(contentType: 'list' | 'post', contentId: string) {
  return useOptimisticMutation({
    mutationFn: async ({ reaction }: { reaction: string | null }) => {
      const response = await fetch(`/api/${contentType}-reactions/${contentId}`, {
        method: reaction ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: reaction ? JSON.stringify({ reaction }) : undefined,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to react to ${contentType}`);
      }
      
      return response.json();
    },
    queryKey: [`/api/${contentType}-reactions/${contentId}`],
    optimisticUpdate: (oldData: any, { reaction }) => {
      // Complex optimistic update for reactions
      const newReactions = oldData.reactions.filter((r: any) => r.userId !== 'current_user_id');
      if (reaction) {
        newReactions.push({ userId: 'current_user_id', reaction, createdAt: new Date().toISOString() });
      }
      
      return {
        ...oldData,
        reactions: newReactions,
        hasReacted: !!reaction,
        currentReaction: reaction,
      };
    },
    successMessage: undefined, // No toast for reaction actions
  });
}