import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UserCheck, UserPlus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface FollowButtonProps {
  userId: number;
  initialIsFollowing?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
}

export function FollowButton({
  userId,
  initialIsFollowing = false,
  className = "",
  size = "sm",
  variant = "outline",
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const { toast } = useToast();

  // Get real-time following status
  const { data, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/user/following/status', userId],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/user/following/status/${userId}`);
        if (!res.ok) {
          throw new Error('Failed to get following status');
        }
        return await res.json();
      } catch (error) {
        // Silently fail and use initial state instead
        return { isFollowing: initialIsFollowing };
      }
    },
    initialData: { isFollowing: initialIsFollowing },
  });

  // Update local state when we get data
  useEffect(() => {
    if (data && typeof data.isFollowing === 'boolean') {
      setIsFollowing(data.isFollowing);
    }
  }, [data]);

  // Follow user mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/user/follow/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to follow user');
      }
      return await res.json();
    },
    onSuccess: () => {
      setIsFollowing(true);
      toast({
        title: "Success",
        description: "You are now following this user",
      });
      // Invalidate queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['/api/user/following/status', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', userId, 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', 'following'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unfollow user mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/user/follow/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to unfollow user');
      }
      return await res.json();
    },
    onSuccess: () => {
      setIsFollowing(false);
      toast({
        title: "Success",
        description: "You have unfollowed this user",
      });
      // Invalidate queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['/api/user/following/status', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', userId, 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', 'following'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = followMutation.isPending || unfollowMutation.isPending || statusLoading;

  const handleClick = () => {
    if (isLoading) return;
    
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const buttonSizeClasses = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4",
    lg: "h-10 px-6",
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      className={`${className} ${buttonSizeClasses[size]}`}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="h-4 w-4 mr-1" />
      ) : (
        <UserPlus className="h-4 w-4 mr-1" />
      )}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}