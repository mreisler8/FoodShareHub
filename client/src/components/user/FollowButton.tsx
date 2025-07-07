import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Users, UserPlus, UserMinus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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