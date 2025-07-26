import { useState, useEffect } from 'react';
import { UserPlus, UserMinus, UserCheck } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useCurrentUser } from '../hooks/use-current-user';

interface FollowButtonProps {
  userId: number;
  initialFollowing?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
  compactMode?: boolean;
}

export function FollowButton({
  userId,
  initialFollowing,
  variant = 'default',
  size = 'md',
  className = '',
  showIcon = true,
  compactMode = false
}: FollowButtonProps) {
  const { currentUser } = useCurrentUser();
  const [isFollowing, setIsFollowing] = useState(initialFollowing || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't show follow button for self
  if (currentUser?.id === userId) {
    return null;
  }

  // Query to get current follow status if not provided
  const { data: followStatus, isLoading: statusLoading } = useQuery({
    queryKey: [`/api/follow/status/${userId}`],
    enabled: initialFollowing === undefined && !!currentUser?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Update local state when followStatus changes
  useEffect(() => {
    if (followStatus && typeof followStatus === 'object' && 'isFollowing' in followStatus) {
      setIsFollowing(followStatus.isFollowing);
    } else if (initialFollowing !== undefined) {
      setIsFollowing(initialFollowing);
    }
  }, [followStatus, initialFollowing]);

  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      const startTime = Date.now();
      
      try {
        if (action === 'follow') {
          const response = await apiRequest(`/api/follow/${userId}`, { method: 'POST' });
          return response;
        } else {
          const response = await apiRequest(`/api/follow/${userId}`, { method: 'DELETE' });
          return response;
        }
      } finally {
        const responseTime = Date.now() - startTime;
        if (responseTime > 500) {
          console.warn(`Follow action took ${responseTime}ms, exceeding 500ms NFR`);
        }
      }
    },
    onMutate: async (action) => {
      // Optimistic update
      const newFollowingState = action === 'follow';
      setIsFollowing(newFollowingState);
      return { previousState: isFollowing };
    },
    onSuccess: (_, action) => {
      const newFollowingState = action === 'follow';
      
      toast({
        title: newFollowingState ? 'Now Following' : 'Unfollowed',
        description: newFollowingState ? 'You are now following this user' : 'You have unfollowed this user',
      });

      // Invalidate related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: [`/api/follow/status/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/followers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/following`] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/search/unified'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discover'] });
    },
    onError: (error: any, action, context) => {
      // Rollback optimistic update
      if (context?.previousState !== undefined) {
        setIsFollowing(context.previousState);
      }
      
      let errorMessage = 'Failed to update follow status';
      if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many follow actions. Please wait before trying again.';
      } else if (error.message?.includes('403')) {
        errorMessage = 'Unable to follow this user at the moment.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    followMutation.mutate(isFollowing ? 'unfollow' : 'follow');
  };

  // Show loading state during initial status check
  if (statusLoading && initialFollowing === undefined) {
    return (
      <Button
        variant="outline"
        size={size === 'md' ? 'default' : size}
        disabled
        className={className}
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      </Button>
    );
  }

  const isLoading = followMutation.isPending;
  const buttonVariant = isFollowing ? 'outline' : variant;
  const hoverClasses = isFollowing ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300' : '';

  return (
    <Button
      variant={buttonVariant}
      size={size === 'md' ? 'default' : size}
      onClick={handleClick}
      disabled={isLoading}
      className={`${className} ${hoverClasses} transition-all duration-200`}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        <>
          {showIcon && (
            isFollowing ? (
              compactMode ? (
                <UserCheck className="h-4 w-4" />
              ) : (
                <UserMinus className="h-4 w-4 mr-1" />
              )
            ) : (
              <UserPlus className="h-4 w-4 mr-1" />
            )
          )}
          {!compactMode && (
            isFollowing ? 'Unfollow' : 'Follow'
          )}
        </>
      )}
    </Button>
  );
}