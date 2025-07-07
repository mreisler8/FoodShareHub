import { Button } from "@/components/Button";
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
  variant?: "primary" | "secondary" | "outline";
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
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Users } from "lucide-react";

interface FollowButtonProps {
  userId: number;
  userName: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  showIcon?: boolean;
  className?: string;
}

export function FollowButton({ 
  userId, 
  userName, 
  size = "sm", 
  variant = "outline",
  showIcon = true,
  className = ""
}: FollowButtonProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();

  // Don't show follow button for self
  if (currentUser?.id === userId) {
    return null;
  }

  // Check if already following
  const { data: followStatus, isLoading } = useQuery({
    queryKey: [`/api/follow/status/${userId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/follow/status/${userId}`);
      return res.json();
    },
    enabled: !!currentUser && currentUser.id !== userId,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (action === 'follow') {
        const res = await apiRequest("POST", `/api/follow/${userId}`);
        return res.json();
      } else {
        const res = await apiRequest("DELETE", `/api/follow/${userId}`);
        return res.json();
      }
    },
    onSuccess: (data, action) => {
      // Invalidate follow status and counts
      queryClient.invalidateQueries({ queryKey: [`/api/follow/status/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/follow/followers/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/follow/following/${currentUser?.id}`] });
      
      toast({
        title: action === 'follow' ? "Following!" : "Unfollowed",
        description: action === 'follow' 
          ? `You're now following ${userName}` 
          : `You've unfollowed ${userName}`,
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

  const isFollowing = followStatus?.isFollowing;

  const handleClick = () => {
    followMutation.mutate(isFollowing ? 'unfollow' : 'follow');
  };

  if (isLoading) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        disabled 
        className={className}
      >
        {showIcon && <Users className="h-4 w-4 mr-1" />}
        ...
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size={size}
      onClick={handleClick}
      disabled={followMutation.isPending}
      className={`${className} ${isFollowing ? 'text-muted-foreground hover:text-destructive' : ''}`}
    >
      {followMutation.isPending ? (
        <>
          {showIcon && <Users className="h-4 w-4 mr-1" />}
          {isFollowing ? "Unfollowing..." : "Following..."}
        </>
      ) : (
        <>
          {showIcon && (
            isFollowing ? 
              <UserMinus className="h-4 w-4 mr-1" /> : 
              <UserPlus className="h-4 w-4 mr-1" />
          )}
          {isFollowing ? "Following" : "Follow"}
        </>
      )}
    </Button>
  );
}
