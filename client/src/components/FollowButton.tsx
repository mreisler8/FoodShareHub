import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useCurrentUser } from '../hooks/use-current-user';

interface FollowButtonProps {
  userId: number;
  initialFollowing?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  compactMode?: boolean;
}

export function FollowButton({ 
  userId, 
  initialFollowing, 
  size = "sm", 
  variant = "outline",
  className = "",
  compactMode = false
}: FollowButtonProps) {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialFollowing || false);

  // Don't show follow button for self
  if (currentUser?.id === userId) {
    return null;
  }

  // Query follow status if not provided initially
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

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (action === 'follow') {
        return await apiRequest(`/api/follow/${userId}`, {
          method: "POST"
        });
      } else {
        return await apiRequest(`/api/follow/${userId}`, {
          method: "DELETE"
        });
      }
    },
    onMutate: async (action) => {
      // Optimistic update
      setIsFollowing(action === 'follow');
    },
    onSuccess: (_, action) => {
      // Invalidate all follow-related queries
      queryClient.invalidateQueries({ queryKey: [`/api/follow/status/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/following/${currentUser?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/me`] });
      queryClient.invalidateQueries({ queryKey: ['/api/search/unified'] });

      toast({
        title: action === 'follow' ? "Following!" : "Unfollowed",
        description: action === 'follow' ? "You're now following this user" : "You've unfollowed this user",
      });
    },
    onError: (error: any, action) => {
      // Revert optimistic update
      setIsFollowing(action === 'unfollow');
      
      toast({
        title: "Action failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
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
          {isFollowing ? 'Unfollow' : 'Follow'}
        </>
      )}
    </Button>
  );
}