import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  userId: number;
  isFollowing: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  userId,
  isFollowing,
  size = "sm",
  variant = "default",
  className,
  onFollowChange
}: FollowButtonProps) {
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: async (shouldFollow: boolean) => {
      if (shouldFollow) {
        return apiRequest(`/api/follow/${userId}`, {
          method: "POST"
        });
      } else {
        return apiRequest(`/api/follow/${userId}`, {
          method: "DELETE"
        });
      }
    },
    onSuccess: (_, shouldFollow) => {
      setLocalIsFollowing(shouldFollow);
      onFollowChange?.(shouldFollow);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/follow/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/search/unified"] });
      
      toast({
        title: shouldFollow ? "Followed" : "Unfollowed",
        description: shouldFollow 
          ? "You are now following this user" 
          : "You are no longer following this user",
      });
    },
    onError: (error, shouldFollow) => {
      console.error("Follow error:", error);
      toast({
        title: "Error",
        description: shouldFollow 
          ? "Failed to follow user. Please try again." 
          : "Failed to unfollow user. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    followMutation.mutate(!localIsFollowing);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={followMutation.isPending}
      size={size}
      variant={localIsFollowing ? "secondary" : variant}
      className={className}
    >
      {followMutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : localIsFollowing ? (
        <UserCheck className="h-3 w-3" />
      ) : (
        <UserPlus className="h-3 w-3" />
      )}
      
      {size !== "sm" && (
        <span className="ml-1">
          {localIsFollowing ? "Following" : "Follow"}
        </span>
      )}
    </Button>
  );
}