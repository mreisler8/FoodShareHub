
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

interface FollowRowProps {
  creators: User[];
}

export function FollowRow({ creators }: FollowRowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [followedUsers, setFollowedUsers] = useState<Set<number>>(new Set());

  const followMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/follow/${userId}`, {
        method: "POST",
      });
    },
    onSuccess: (_, userId) => {
      setFollowedUsers(prev => new Set([...prev, userId]));
      toast({
        title: "Following!",
        description: "User added to your following list",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive",
      });
    },
  });

  if (!creators || creators.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Follow some foodie travelers to get started</h2>
        <p className="text-gray-600">Follow popular creators to personalize your feed.</p>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 px-2">
        {creators.map((creator) => {
          const isFollowed = followedUsers.has(creator.id);
          
          return (
            <div className="flex flex-col items-center min-w-[100px] space-y-2" key={creator.id}>
              <div className="relative">
                {creator.profilePicture ? (
                  <img 
                    src={creator.profilePicture} 
                    alt={creator.name}
                    className="rounded-full h-16 w-16 object-cover border-2 border-gray-200" 
                  />
                ) : (
                  <div className="rounded-full h-16 w-16 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-gray-200">
                    <span className="text-white font-medium text-lg">
                      {creator.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium">{creator.name}</p>
                <p className="text-xs text-gray-500">@{creator.username}</p>
              </div>
              
              <Button 
                size="sm"
                variant={isFollowed ? "outline" : "default"}
                onClick={() => !isFollowed && followMutation.mutate(creator.id)}
                disabled={followMutation.isPending || isFollowed}
                className="w-full"
              >
                {isFollowed ? "Following" : "Follow"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
