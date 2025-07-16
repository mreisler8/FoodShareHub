import { User, UserPlus } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link } from "wouter";

interface SuggestedUser {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
  bio?: string;
  mutualConnections?: number;
  isFollowing?: boolean;
}

export function SuggestedUsersCard() {
  const [followingUsers, setFollowingUsers] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // For now, we'll use a mock endpoint - in production this would be real suggested users
  const { data: suggestedUsers, isLoading } = useQuery({
    queryKey: ['/api/users/suggested'],
    queryFn: async () => {
      // Mock data for suggested users
      return [
        {
          id: 1,
          name: "Sarah Chen",
          username: "sarahfoodie",
          profilePicture: null,
          bio: "Food blogger exploring NYC's hidden gems",
          mutualConnections: 3,
          isFollowing: false
        },
        {
          id: 2,
          name: "Mike Rodriguez",
          username: "mikeats",
          profilePicture: null,
          bio: "Taco enthusiast and weekend chef",
          mutualConnections: 1,
          isFollowing: false
        },
        {
          id: 3,
          name: "Emily Park",
          username: "emilyeats",
          profilePicture: null,
          bio: "Michelin star hunter",
          mutualConnections: 5,
          isFollowing: false
        }
      ] as SuggestedUser[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const followMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number, action: 'follow' | 'unfollow' }) => {
      if (action === 'follow') {
        return await apiRequest(`/api/follow/${userId}`, { method: 'POST' });
      } else {
        return await apiRequest(`/api/follow/${userId}`, { method: 'DELETE' });
      }
    },
    onSuccess: (_, { userId, action }) => {
      if (action === 'follow') {
        setFollowingUsers(prev => new Set(prev).add(userId));
        toast({
          title: "Following!",
          description: "You're now following this user",
        });
      } else {
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast({
          title: "Unfollowed",
          description: "You unfollowed this user",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/users/suggested'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive",
      });
    },
  });

  const handleFollow = (userId: number) => {
    const isCurrentlyFollowing = followingUsers.has(userId);
    followMutation.mutate({ 
      userId, 
      action: isCurrentlyFollowing ? 'unfollow' : 'follow' 
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-neutral-200">
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-neutral-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-neutral-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const users = suggestedUsers || [];

  if (users.length === 0) {
    return (
      <Card className="bg-white border border-neutral-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Suggested People
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-neutral-500 text-center py-4">
            No suggestions available right now
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-neutral-200 hover:border-neutral-300 transition-colors">
      <div className="p-4 pb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Suggested People
        </h3>
      </div>
      <div className="px-4 pb-4">
        <div className="space-y-4">
          {users.slice(0, 3).map((user) => {
            const isFollowing = followingUsers.has(user.id);
            return (
              <div key={user.id} className="flex items-center justify-between">
                <Link href={`/users/${user.id}`}>
                  <div className="flex items-center space-x-3 cursor-pointer hover:bg-neutral-50 -mx-2 px-2 py-1 rounded transition-colors">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        @{user.username}
                      </p>
                      {user.mutualConnections && user.mutualConnections > 0 && (
                        <p className="text-xs text-neutral-400">
                          {user.mutualConnections} mutual connections
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                <Button
                  variant={isFollowing ? "outline" : "primary"}
                  size="sm"
                  onClick={() => handleFollow(user.id)}
                  disabled={followMutation.isPending}
                  className="ml-2"
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              </div>
            );
          })}
        </div>
        
        {users.length > 3 && (
          <div className="mt-4 pt-3 border-t border-neutral-100">
            <Link href="/discover/people">
              <Button variant="outline" size="sm" className="w-full">
                View All Suggestions
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}