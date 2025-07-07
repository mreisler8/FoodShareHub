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
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./FollowButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck } from "lucide-react";
import { Link } from "wouter";

interface FollowsPanelProps {
  userId: number;
  userName: string;
  activeTab?: "followers" | "following";
}

interface FollowUser {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
  bio?: string;
  followedAt: string;
}

export function FollowsPanel({ userId, userName, activeTab = "followers" }: FollowsPanelProps) {
  const { data: followers, isLoading: followersLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/follow/followers/${userId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/follow/followers/${userId}`);
      return res.json();
    },
  });

  const { data: following, isLoading: followingLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/follow/following/${userId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/follow/following/${userId}`);
      return res.json();
    },
  });

  const renderUserList = (users: FollowUser[] | undefined, isLoading: boolean, emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      );
    }

    if (!users || users.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="flex items-center space-x-3">
            <Link href={`/profile/${user.id}`} className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profilePicture} />
                <AvatarFallback>
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                {user.bio && (
                  <p className="text-xs text-muted-foreground truncate mt-1">{user.bio}</p>
                )}
              </div>
            </Link>
            <FollowButton userId={user.id} userName={user.name} size="sm" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Followers</span>
            <Badge variant="secondary">{followers?.length || 0}</Badge>
          </CardTitle>
          <CardDescription>
            People following {userName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderUserList(
            followers, 
            followersLoading, 
            `${userName} doesn't have any followers yet.`
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Following</span>
            <Badge variant="secondary">{following?.length || 0}</Badge>
          </CardTitle>
          <CardDescription>
            People {userName} follows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderUserList(
            following, 
            followingLoading, 
            `${userName} isn't following anyone yet.`
          )}
        </CardContent>
      </Card>
    </div>
  );
}
