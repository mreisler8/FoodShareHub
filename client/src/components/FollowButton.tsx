import { useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface FollowButtonProps {
  userId: number;
  initialFollowing: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FollowButton({
  userId,
  initialFollowing,
  variant = 'default',
  size = 'md',
  className = ''
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (action === 'follow') {
        return apiRequest(`/api/users/${userId}/follow`, { method: 'POST' });
      } else {
        return apiRequest(`/api/users/${userId}/follow`, { method: 'DELETE' });
      }
    },
    onSuccess: (_, action) => {
      const newFollowingState = action === 'follow';
      setIsFollowing(newFollowingState);
      
      toast({
        title: newFollowingState ? 'Now following' : 'Unfollowed',
        description: newFollowingState ? 'You are now following this user' : 'You have unfollowed this user',
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/stats`] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update follow status',
        variant: 'destructive',
      });
    },
  });

  const handleClick = () => {
    followMutation.mutate(isFollowing ? 'unfollow' : 'follow');
  };

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleClick}
      disabled={followMutation.isPending}
      className={`${className} ${isFollowing ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300' : ''}`}
    >
      {followMutation.isPending ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-1" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
}