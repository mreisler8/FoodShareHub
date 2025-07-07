import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "./FollowButton";
import { Users, UserCheck, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FollowUser {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
  bio?: string;
  followedAt?: string;
}

interface FollowsPanelProps {
  userId: number;
  className?: string;
}

export function FollowsPanel({ userId, className = "" }: FollowsPanelProps) {
  const [activeTab, setActiveTab] = useState("followers");

  // Fetch followers
  const { data: followers, isLoading: followersLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/user/${userId}/followers`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/${userId}/followers`);
      return res.json();
    },
  });

  // Fetch following
  const { data: following, isLoading: followingLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/user/${userId}/following`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/${userId}/following`);
      return res.json();
    },
  });

  const renderUserList = (users: FollowUser[] | undefined, isLoading: boolean, emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3 p-3">
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
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profilePicture} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/profile/${user.id}`} className="hover:underline">
                  <p className="font-medium text-sm">{user.name}</p>
                </Link>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
                {user.bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
                )}
              </div>
            </div>
            <FollowButton
              userId={user.id}
              userName={user.name}
              size="sm"
              variant="outline"
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="followers" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Followers ({followers?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="following" className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4" />
            <span>Following ({following?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followers" className="mt-4">
          {renderUserList(followers, followersLoading, "No followers yet")}
        </TabsContent>

        <TabsContent value="following" className="mt-4">
          {renderUserList(following, followingLoading, "Not following anyone yet")}
        </TabsContent>
      </Tabs>
    </div>
  );
}