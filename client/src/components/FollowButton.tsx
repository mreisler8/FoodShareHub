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
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  compactMode?: boolean;
}

export function FollowButton({ 
  userId, 
  initialFollowing = false, 
  size = "sm", 
  variant = "outline",
  className = "",
  compactMode = false
}: FollowButtonProps) {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't show follow button for self
  if (currentUser?.id === userId) {
    return null;
  }

  // Check follow status from server
  const { data: followStatus, isLoading } = useQuery({
    queryKey: [`/api/follow/status/${userId}`],
    enabled: !!currentUser && currentUser.id !== userId,
  });

  const isFollowing = followStatus?.isFollowing ?? initialFollowing;

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
    onError: (error: any) => {
      toast({
        title: "Action failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

const handleClick = () => {
    followMutation.mutate(isFollowing ? 'unfollow' : 'follow');
  };

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