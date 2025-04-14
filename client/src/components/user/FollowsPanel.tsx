import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { FollowButton } from "./FollowButton";
import { useAuth } from "@/hooks/use-auth";

interface UserData {
  id: number;
  name: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
}

interface FollowsPanelProps {
  userId: number;
  className?: string;
}

export function FollowsPanel({ userId, className = "" }: FollowsPanelProps) {
  const { user: currentUser } = useAuth();
  
  // Fetch followers
  const { data: followers, isLoading: followersLoading } = useQuery<UserData[]>({
    queryKey: ['/api/user', userId, 'followers'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/user/${userId}/followers`);
      if (!res.ok) throw new Error("Failed to fetch followers");
      return res.json();
    }
  });

  // Fetch following
  const { data: following, isLoading: followingLoading } = useQuery<UserData[]>({
    queryKey: ['/api/user', userId, 'following'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/user/${userId}/following`);
      if (!res.ok) throw new Error("Failed to fetch following");
      return res.json();
    }
  });

  const isLoading = followersLoading || followingLoading;

  const renderUserList = (users: UserData[] | undefined, loading: boolean) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!users || users.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          No users found
        </div>
      );
    }

    return (
      <div className="space-y-4 p-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user.profilePicture || ""} alt={user.name} />
                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">@{user.username}</div>
              </div>
            </div>
            {currentUser && currentUser.id !== user.id && (
              <FollowButton userId={user.id} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="followers">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="followers">
              Followers
              {followers && followers.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 px-1.5 rounded-full">
                  {followers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="following">
              Following
              {following && following.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 px-1.5 rounded-full">
                  {following.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="followers">
            {renderUserList(followers, followersLoading)}
          </TabsContent>
          <TabsContent value="following">
            {renderUserList(following, followingLoading)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}