
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { suggestedUsers } from "@/data/mockFeedData";

export function Onboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      // For mock data, simulate API call
      return Promise.resolve();
    },
    onSuccess: (_, userId) => {
      setFollowedUsers(prev => new Set([...prev, userId]));
      const user = suggestedUsers.find(u => u.id === userId);
      toast({
        title: "Following!",
        description: `You're now following ${user?.name}`,
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

  return (
    <div className="space-y-4 px-4 py-6 bg-white rounded-lg border mb-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Follow some foodie travelers to get started</h2>
        <p className="text-gray-600">Follow popular creators to personalize your feed.</p>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 px-2">
        {suggestedUsers.map((user) => {
          const isFollowed = followedUsers.has(user.id);
          
          return (
            <div className="flex flex-col items-center min-w-[100px] space-y-2" key={user.id}>
              <div className="relative">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="rounded-full h-16 w-16 object-cover border-2 border-gray-200" 
                />
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.handle}</p>
              </div>
              
              <Button 
                size="sm"
                variant={isFollowed ? "outline" : "default"}
                onClick={() => !isFollowed && followMutation.mutate(user.id)}
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
