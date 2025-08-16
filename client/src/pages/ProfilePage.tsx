import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
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
import { OptimizedSearchModal } from "@/components/search/OptimizedSearchModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RestaurantListsSection } from "@/components/lists/RestaurantListsSection";
import { useAuth } from "@/hooks/use-auth";
import { SendToFriendModal } from "@/components/sharing/SendToFriendModal";
import { ShareLinkModal } from "@/components/sharing/ShareLinkModal";
import EmptyState from "@/components/ui/EmptyState";
import { NotFound } from "@/components/ui/NotFound";
import { InlineError } from "@/components/common/InlineError";
import { GlobalHeader } from "@/components/ui/GlobalHeader";
import { ProfileLoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { getErrorMessage } from "@/lib/error-utils";



export default function ProfilePage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("posts");
  const [showFindFriendsModal, setShowFindFriendsModal] = useState(false);
  const [showSendToFriend, setShowSendToFriend] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Validate ID parameter if provided
  if (id && !/^\d+$/.test(id)) {
    return <NotFound title="Invalid Profile" message="The profile ID is not valid." />;
  }

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
    queryKey: [`/api/follow/followers/${userId}`],
    enabled: !!userId && activeTab === "network",
    staleTime: 30 * 1000, // 30 seconds cache for real-time feel
  });

  const { data: following } = useQuery({
    queryKey: [`/api/follow/following/${userId}`],
    enabled: !!userId && activeTab === "network",
    staleTime: 30 * 1000, // 30 seconds cache for real-time feel
  });

  // Follow/Unfollow mutation with optimistic updates
  const followMutation = useMutation({
    mutationFn: async ({ targetUserId, action }: { targetUserId: number; action: 'follow' | 'unfollow' }) => {
      if (action === 'follow') {
        return await apiRequest(`/api/follow/${targetUserId}`, {
          method: "POST"
        });
      } else {
        return await apiRequest(`/api/follow/${targetUserId}`, {
          method: "DELETE"
        });
      }
    },
    onSuccess: (_, { targetUserId, action }) => {
      // Invalidate all follow-related queries
      queryClient.invalidateQueries({ queryKey: [`/api/follow/status/${targetUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${targetUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/follow/followers/${targetUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/follow/following/${currentUser?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}/stats`] });

      toast({
        title: action === 'follow' ? "Following!" : "Unfollowed",
        description: action === 'follow' ? "You're now following this user" : "You've unfollowed this user",
      });
    },
    onError: (err, { action }) => {
      toast({
        title: `${action === 'follow' ? 'Follow' : 'Unfollow'} failed`,
        description: "Unable to complete action. Please try again.",
        variant: "destructive"
      });
    }
  });



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
              {/* Clean background pattern - no emojis */}
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
                      size="sm"
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
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="posts" className="text-xs md:text-sm">
            <MessageCircle className="h-4 w-4 mr-1 md:mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="lists" className="text-xs md:text-sm">
            <Bookmark className="h-4 w-4 mr-1 md:mr-2" />
            Lists
          </TabsTrigger>
          <TabsTrigger value="moments" className="text-xs md:text-sm">
            <ChefHat className="h-4 w-4 mr-1 md:mr-2" />
            Moments
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
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-20 w-full mb-4" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : userPosts && Array.isArray(userPosts) && userPosts.length > 0 ? (
        <div className="space-y-6">
          {userPosts.map((post: any) => (
            <div key={post.id} className="transform transition-all duration-200 hover:scale-[1.01]">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-6">
            <MessageCircle className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isOwnProfile ? "No posts yet" : `${profileUser?.name || 'This user'} hasn't posted yet`}
          </h3>
          <p className="text-gray-600 text-center max-w-sm mb-6">
            {isOwnProfile 
              ? "Share your first food experience! Tell your circles about a great meal or hidden gem." 
              : "Check back later for new posts and food discoveries."
            }
          </p>
          {isOwnProfile && (
            <Button 
              className="bg-primary hover:bg-primary/90 transition-colors"
              onClick={() => window.location.href = '/create-post'}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Create Your First Post
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const ListsTab = () => (
    <div className="px-4 md:px-6 py-6">
      {isListsLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex -space-x-2">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-8 w-8 rounded-full border-2 border-white" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : userLists && Array.isArray(userLists) && userLists.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {userLists.map((list: any) => {
            console.log('ProfilePage list data:', list.name, 'restaurantCount:', list.restaurantCount);
            return (
            <Link href={`/lists/${list.id}`} key={list.id}>
              <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                      {list.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {list.description || "A curated collection of great places"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-3 bg-gray-50 text-gray-700">
                    {list.restaurantCount || 0} places
                  </Badge>
                </div>

                {/* Preview Images */}
                {list.previewImages && list.previewImages.length > 0 && (
                  <div className="flex -space-x-2 mb-4">
                    {list.previewImages.slice(0, 3).map((image: string, index: number) => (
                      <div key={index} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {list.previewImages.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          +{list.previewImages.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    {list.isPublic ? (
                      <>
                        <Crown className="h-3 w-3" />
                        Public
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" />
                        Private
                      </>
                    )}
                  </span>
                  <span>{new Date(list.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
              </Card>
            </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-6">
            <Bookmark className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isOwnProfile ? "No lists yet" : `${profileUser?.name || 'This user'} hasn't created any lists`}
          </h3>
          <p className="text-gray-600 text-center max-w-sm mb-6">
            {isOwnProfile 
              ? "Create curated lists of your favorite restaurants to share with your circles."
              : "Check back later for curated restaurant recommendations."
            }
          </p>
          {isOwnProfile && (
            <Button 
              className="bg-primary hover:bg-primary/90 transition-colors"
              onClick={() => navigate('/create-list')}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Create Your First List
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const RatingsTab = () => (
    <div className="px-4 md:px-6 py-6">
      {isRatingsLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-3" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="flex items-center gap-1 ml-4">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-5 w-5 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : userRatings && Array.isArray(userRatings) && userRatings.length > 0 ? (
        <div className="space-y-4">
          {userRatings.map((rating: any) => (
            <Card key={rating.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                      {rating.restaurant?.name || 'Restaurant'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {rating.restaurant?.location || 'Location not specified'}
                    </p>
                    {rating.notes && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-3 line-clamp-2">
                        "{rating.notes}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Rated on {new Date(rating.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-5 w-5 transition-colors ${
                            i < (rating.ratingValue || 0) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {rating.ratingValue || 0}/5
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-full flex items-center justify-center mb-6">
            <Star className="h-10 w-10 text-yellow-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isOwnProfile ? "No ratings yet" : `${profileUser?.name || 'This user'} hasn't rated any restaurants`}
          </h3>
          <p className="text-gray-600 text-center max-w-sm mb-6">
            {isOwnProfile 
              ? "Start rating restaurants to help your circles discover great places to eat."
              : "Check back later for restaurant ratings and reviews."
            }
          </p>
          {isOwnProfile && (
            <Button 
              className="bg-yellow-500 hover:bg-yellow-600 text-white transition-colors"
              onClick={() => window.location.href = '/quick-ratings'}
            >
              <Star className="h-4 w-4 mr-2" />
              Rate Your First Restaurant
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const MomentsTab = () => {
    const { data: userMoments, isLoading: isMomentsLoading } = useQuery({
      queryKey: [`/api/users/${userId}/moments`],
      enabled: !!userId && activeTab === "moments",
      staleTime: 2 * 60 * 1000,
    });

    return (
      <div className="px-4 md:px-6 py-6">
        {isMomentsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : userMoments && Array.isArray(userMoments) && userMoments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userMoments.map((moment: any) => (
              <Card key={moment.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-100 overflow-hidden">
                {moment.photo && (
                  <div className="aspect-[4/3] overflow-hidden">
                    <img 
                      src={moment.photo} 
                      alt={moment.caption || 'Food moment'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                      {moment.restaurant?.name || 'Food Moment'}
                    </h3>
                    <Badge variant="secondary" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                      <ChefHat className="h-3 w-3 mr-1" />
                      Moment
                    </Badge>
                  </div>
                  {moment.caption && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {moment.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {moment.restaurant?.location || 'Unknown location'}
                    </span>
                    <span>{new Date(moment.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full flex items-center justify-center mb-6">
              <ChefHat className="h-10 w-10 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isOwnProfile ? "No food moments yet" : `${profileUser?.name || 'This user'} hasn't shared any food moments`}
            </h3>
            <p className="text-gray-600 text-center max-w-sm mb-6">
              {isOwnProfile 
                ? "Capture and share your memorable food experiences with your circles."
                : "Food moments will appear here when they're shared."
              }
            </p>
            {isOwnProfile && (
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                onClick={() => window.location.href = '/create-post'}
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Share Your First Moment
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const NetworkTab = () => (
    <div className="px-4 md:px-6 py-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Followers */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Followers
              {followers && Array.isArray(followers) && followers.length > 0 ? (
                <Badge variant="secondary" className="ml-2">
                  {followers.length}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followers && Array.isArray(followers) && followers.length > 0 ? (
              <div className="space-y-4">
                {followers.slice(0, 5).map((follower: any) => (
                  <div key={follower.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <Link to={"/profile/" + follower.id} className="flex items-center gap-3 flex-1 cursor-pointer">
                      <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                        <AvatarImage src={follower.profileImageUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {follower.name?.[0] || follower.username?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900 hover:text-primary transition-colors">
                          {follower.name || follower.username}
                        </p>
                        <p className="text-xs text-gray-600">@{follower.username}</p>
                        {follower.bio && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {follower.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                    {!isOwnProfile && follower.id !== currentUser?.id && (
                      <FollowButton 
                        userId={follower.id}
                        size="sm"
                        className="shrink-0 ml-3"
                      />
                    )}
                  </div>
                ))}
                {followers.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full mt-4 border-gray-200 hover:bg-gray-50">
                    View all {followers.length} followers                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No followers yet</p>
                {isOwnProfile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Share great content to attract followers
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Following */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Following
              {following && Array.isArray(following) && following.length > 0 ? (
                <Badge variant="secondary" className="ml-2">
                  {following.length}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {following && Array.isArray(following) && following.length > 0 ? (
              <div className="space-y-4">
                {following.slice(0, 5).map((followed: any) => (
                  <div key={followed.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <Link to={"/profile/" + followed.id} className="flex items-center gap-3 flex-1 cursor-pointer">
                      <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                        <AvatarImage src={followed.profileImageUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {followed.name?.[0] || followed.username?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900 hover:text-primary transition-colors">
                          {followed.name || followed.username}
                        </p>
                        <p className="text-xs text-gray-600">@{followed.username}</p>
                        {followed.bio && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {followed.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                    {!isOwnProfile && followed.id !== currentUser?.id && (
                      <FollowButton 
                        userId={followed.id}
                        size="sm"
                        className="shrink-0 ml-3"
                      />
                    )}
                  </div>
                ))}
                {following.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full mt-4 border-gray-200 hover:bg-gray-50">
                    View all {following.length} following
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Not following anyone yet</p>
                {isOwnProfile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Find friends to follow their recommendations
                  </p>
                )}
              </div>
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

      {/* Main Content Area */}
      <div className="flex-1 max-w-4xl mx-auto">
        <GlobalHeader 
          title={profileUser?.name || profileUser?.username || "Profile"} 
          backButton={true}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-14">
          <ProfileHeader />
          <ProfileTabs />

          <TabsContent value="posts" className="mt-0 profile-tab-transition">
            <PostsTab />
          </TabsContent>

          <TabsContent value="lists" className="mt-0 profile-tab-transition">
            <ListsTab />
          </TabsContent>

          <TabsContent value="ratings" className="mt-0 profile-tab-transition">
            <RatingsTab />
          </TabsContent>

          <TabsContent value="moments" className="mt-0 profile-tab-transition">
            <MomentsTab />
          </TabsContent>

          <TabsContent value="network" className="mt-0 profile-tab-transition">
            <NetworkTab />
          </TabsContent>
        </Tabs>

        {/* Find Friends Modal */}
        <OptimizedSearchModal
          open={showFindFriendsModal}
          onOpenChange={setShowFindFriendsModal}
          searchType="users"
          showLocationServices={false}
          placeholder="Search for users to follow..."
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