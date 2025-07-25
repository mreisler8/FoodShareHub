import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/home/PostCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  MapPin, 
  Settings, 
  Share2, 
  Users, 
  Star,
  Heart,
  Bookmark,
  ChefHat,
  MessageCircle,
  Crown,
  Award,
  User,
  MoreHorizontal,
  UserPlus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserWithStats } from "@/lib/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FollowButton } from "@/components/FollowButton";
import { ProfileStats } from "@/components/ProfileStats";
import { UserSearchModal } from "@/components/search/UserSearchModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RestaurantListsSection } from "@/components/lists/RestaurantListsSection";
import { useAuth } from "@/hooks/use-auth";
import { SendToFriendModal } from "@/components/sharing/SendToFriendModal";
import { ShareLinkModal } from "@/components/sharing/ShareLinkModal";
import EmptyState from "@/components/ui/EmptyState";

export default function ProfilePage() {
  const { id } = useParams();
  const { currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("posts");
  const [showFindFriendsModal, setShowFindFriendsModal] = useState(false);
  const [showSendToFriend, setShowSendToFriend] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // If no id specified, show the current user's profile
  const userId = id ? parseInt(id) : currentUser?.id;
  const isOwnProfile = userId === currentUser?.id;

  // Fetch user profile with enhanced data
  const { data: profileUser, isLoading: isUserLoading } = useQuery<UserWithStats>({
    queryKey: [userId ? `/api/users/${userId}` : "/api/me"],
    enabled: !!userId || !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Fetch user posts with lazy loading
  const { data: userPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/posts`],
    enabled: !!userId && activeTab === "posts",
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // Fetch user's lists with lazy loading
  const { data: userLists, isLoading: isListsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/lists`],
    enabled: !!userId && activeTab === "lists",
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // Fetch user's ratings with lazy loading
  const { data: userRatings, isLoading: isRatingsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/ratings`],
    enabled: !!userId && activeTab === "ratings",
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // Fetch followers/following with lazy loading
  const { data: followers } = useQuery({
    queryKey: [`/api/followers/${userId}`],
    enabled: !!userId && activeTab === "network",
    staleTime: 30 * 1000, // 30 seconds cache for real-time feel
  });

  const { data: following } = useQuery({
    queryKey: [`/api/following/${userId}`],
    enabled: !!userId && activeTab === "network",
    staleTime: 30 * 1000, // 30 seconds cache for real-time feel
  });

  // Follow/Unfollow mutation with optimistic updates
  const followMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      return await apiRequest(`/api/follow/${targetUserId}`, {
        method: "POST"
      });
    },
    onMutate: async (targetUserId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [`/api/users/${targetUserId}`] });
      const previousData = queryClient.getQueryData([`/api/users/${targetUserId}`]);
      
      queryClient.setQueryData([`/api/users/${targetUserId}`], (old: any) => ({
        ...old,
        followersCount: (old?.followersCount || 0) + 1,
        isFollowing: true
      }));

      return { previousData, targetUserId };
    },
    onError: (err, targetUserId, context) => {
      queryClient.setQueryData([`/api/users/${targetUserId}`], context?.previousData);
      toast({
        title: "Follow failed",
        description: "Unable to follow user. Please try again.",
        variant: "destructive"
      });
    },
    onSettled: (data, error, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${targetUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${targetUserId}`] });
    }
  });

  const handleFollow = () => {
    if (userId) {
      followMutation.mutate(userId);
    }
  };

  const handleShare = () => {
    setShowShareLink(true);
  };

  const handleSendToFriend = () => {
    setShowSendToFriend(true);
  };

  const ProfileHeader = () => (
    <div className="relative bg-white border-b">
      {/* Cover Photo */}
      <div className="h-32 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 relative overflow-hidden">
        {(profileUser as any)?.coverImage ? (
          <img 
            src={(profileUser as any).coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 relative">
            {/* Food-themed background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-4 left-8 text-3xl opacity-20 rotate-12">🍕</div>
              <div className="absolute top-8 right-16 text-2xl opacity-15 -rotate-6">🍔</div>
              <div className="absolute bottom-6 left-16 text-2xl opacity-20 rotate-45">🍜</div>
              <div className="absolute bottom-4 right-8 text-3xl opacity-15 -rotate-12">🍝</div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="px-4 md:px-6 pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-12 md:-mt-16">
          {/* Avatar */}
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white shadow-lg">
            <AvatarImage src={(profileUser as any)?.profileImageUrl || profileUser?.profilePicture} />
            <AvatarFallback className="text-lg md:text-2xl font-semibold">
              {profileUser?.name?.split(' ').map(n => n[0]).join('') || 
               profileUser?.username?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Profile Info */}
          <div className="flex-1 pt-2 md:pt-4 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                  {profileUser?.name || profileUser?.username}
                </h1>
                <p className="text-gray-600 text-sm md:text-base">
                  @{profileUser?.username}
                </p>
                {profileUser?.bio && (
                  <p className="text-gray-700 mt-2 text-sm md:text-base max-w-md">
                    {profileUser.bio}
                  </p>
                )}
                {(profileUser as any)?.location && (
                  <div className="flex items-center gap-1 mt-2 text-gray-600 text-sm">
                    <MapPin className="h-4 w-4" />
                    {(profileUser as any).location}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isOwnProfile ? (
                  <>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <FollowButton 
                      userId={userId!}
                      className="px-6"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSendToFriend}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats and Circle Memberships */}
        <div className="mt-4 md:mt-6">
          {/* Stats Bar */}
          <div className="flex items-center justify-between">
            <ProfileStats 
              userId={profileUser?.id || 0} 
              layout="horizontal"
              showLabels={true}
            />
            {isOwnProfile && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowFindFriendsModal(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Find Friends
              </Button>
            )}
          </div>

          {/* Circle Memberships (if user has any) */}
          {(profileUser as any)?.circles && (profileUser as any).circles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Member of</h3>
              <div className="flex flex-wrap gap-2">
                {(profileUser as any).circles.slice(0, 3).map((circle: any) => (
                  <Badge key={circle.id} variant="secondary" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    {circle.name}
                  </Badge>
                ))}
                {(profileUser as any).circles.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{(profileUser as any).circles.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Sticky Tabs Component
  const ProfileTabs = () => (
    <div className="sticky top-0 z-40 bg-white border-b">
      <div className="px-4 md:px-6">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="posts" className="text-xs md:text-sm">
            <MessageCircle className="h-4 w-4 mr-1 md:mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="lists" className="text-xs md:text-sm">
            <Bookmark className="h-4 w-4 mr-1 md:mr-2" />
            Lists
          </TabsTrigger>
          <TabsTrigger value="ratings" className="text-xs md:text-sm">
            <Star className="h-4 w-4 mr-1 md:mr-2" />
            Ratings
          </TabsTrigger>
          <TabsTrigger value="network" className="text-xs md:text-sm">
            <Users className="h-4 w-4 mr-1 md:mr-2" />
            Network
          </TabsTrigger>
        </TabsList>
      </div>
    </div>
  );

  // Tab Content Components
  const PostsTab = () => (
    <div className="px-4 md:px-6 py-6">
      {isPostsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : userPosts && Array.isArray(userPosts) && userPosts.length > 0 ? (
        <div className="space-y-4">
          {userPosts.map((post: any) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageCircle}
          title={isOwnProfile ? "No posts yet" : `${profileUser?.name} hasn't posted yet`}
          description={isOwnProfile ? "Share your first food experience!" : "Check back later for new posts."}
        />
      )}
    </div>
  );

  const ListsTab = () => (
    <div className="px-4 md:px-6 py-6">
      {isListsLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : userLists && Array.isArray(userLists) && userLists.length > 0 ? (
        <div className="space-y-4">
          {userLists.map((list: any) => (
            <Card key={list.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{list.name}</h3>
                  <p className="text-sm text-gray-600">{list.description}</p>
                </div>
                <Badge variant="outline">{list.itemCount || 0} items</Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title={isOwnProfile ? "No lists yet" : `${profileUser?.name} hasn't created any lists`}
          description={isOwnProfile ? "Create your first curated restaurant list!" : "Check back later for new lists."}
        />
      )}
    </div>
  );

  const RatingsTab = () => (
    <div className="px-4 md:px-6 py-6">
      {isRatingsLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : userRatings && Array.isArray(userRatings) && userRatings.length > 0 ? (
        <div className="space-y-4">
          {userRatings.map((rating: any) => (
            <Card key={rating.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{rating.restaurant?.name}</h3>
                  <p className="text-sm text-gray-600">{rating.restaurant?.location}</p>
                  {rating.notes && (
                    <p className="text-sm text-gray-700 mt-1">{rating.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${i < rating.ratingValue ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Star}
          title={isOwnProfile ? "No ratings yet" : `${profileUser?.name} hasn't rated any restaurants`}
          description={isOwnProfile ? "Rate your first restaurant experience!" : "Check back later for new ratings."}
        />
      )}
    </div>
  );

  const NetworkTab = () => (
    <div className="px-4 md:px-6 py-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Followers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Followers</CardTitle>
          </CardHeader>
          <CardContent>
            {followers && Array.isArray(followers) && followers.length > 0 ? (
              <div className="space-y-3">
                {followers.slice(0, 5).map((follower: any) => (
                  <div key={follower.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={follower.profileImageUrl} />
                        <AvatarFallback>{follower.name?.[0] || follower.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{follower.name || follower.username}</p>
                        <p className="text-xs text-gray-600">@{follower.username}</p>
                      </div>
                    </div>
                    {!isOwnProfile && follower.id !== currentUser?.id && (
                      <FollowButton 
                        userId={follower.id}
                        size="sm"
                      />
                    )}
                  </div>
                ))}
                {followers.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    View all {followers.length} followers
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No followers yet</p>
            )}
          </CardContent>
        </Card>

        {/* Following */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Following</CardTitle>
          </CardHeader>
          <CardContent>
            {following && Array.isArray(following) && following.length > 0 ? (
              <div className="space-y-3">
                {following.slice(0, 5).map((followed: any) => (
                  <div key={followed.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={followed.profileImageUrl} />
                        <AvatarFallback>{followed.name?.[0] || followed.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{followed.name || followed.username}</p>
                        <p className="text-xs text-gray-600">@{followed.username}</p>
                      </div>
                    </div>
                    {!isOwnProfile && followed.id !== currentUser?.id && (
                      <FollowButton 
                        userId={followed.id}
                        size="sm"
                      />
                    )}
                  </div>
                ))}
                {following.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    View all {following.length} following
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Not following anyone yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen mb-16 md:mb-0">
        <MobileNavigation />
        <DesktopSidebar />
        <div className="flex-1 max-w-4xl mx-auto">
          <Skeleton className="h-48 w-full" />
          <div className="px-4 md:px-6 pt-16 pb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-20 w-full mb-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex min-h-screen mb-16 md:mb-0">
        <MobileNavigation />
        <DesktopSidebar />
        <div className="flex-1 max-w-4xl mx-auto px-4 py-6">
          <EmptyState
            icon={User}
            title="User not found"
            description="The user you're looking for doesn't exist or has been removed."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      <MobileNavigation />
      <DesktopSidebar />
      
      <div className="flex-1 max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ProfileHeader />
          <ProfileTabs />
          
          <TabsContent value="posts" className="mt-0">
            <PostsTab />
          </TabsContent>
          
          <TabsContent value="lists" className="mt-0">
            <ListsTab />
          </TabsContent>
          
          <TabsContent value="ratings" className="mt-0">
            <RatingsTab />
          </TabsContent>
          
          <TabsContent value="network" className="mt-0">
            <NetworkTab />
          </TabsContent>
        </Tabs>

        {/* Find Friends Modal */}
        <UserSearchModal
          isOpen={showFindFriendsModal}
          onClose={() => setShowFindFriendsModal(false)}
          title="Find Friends"
        />

        {/* Send to Friend Modal */}
        <SendToFriendModal
          isOpen={showSendToFriend}
          onClose={() => setShowSendToFriend(false)}
          entityType="restaurant"
          entityId={profileUser?.id?.toString() || ""}
          entityName={profileUser?.name || profileUser?.username || ""}
        />

        {/* Share Link Modal */}
        <ShareLinkModal
          isOpen={showShareLink}
          onClose={() => setShowShareLink(false)}
          entityType="restaurant"
          entityId={profileUser?.id?.toString() || ""}
          entityName={profileUser?.name || profileUser?.username || ""}
        />
      </div>
    </div>
  );
}