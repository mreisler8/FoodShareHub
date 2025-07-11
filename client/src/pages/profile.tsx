
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/home/PostCard";
import { Button } from "@/components/ui/button";
import { CreatePostButton } from "@/components/create-post/CreatePostButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  CalendarDays, 
  MapPin, 
  Settings, 
  Share2, 
  Users, 
  Star,
  Heart,
  Bookmark,
  ChefHat,
  MessageCircle,
  Camera,
  Globe,
  Shield,
  Crown,
  Award
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserWithStats } from "@/lib/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ReferralButton } from "@/components/invitation/ReferralButton";
import { FollowButton } from "@/components/FollowButton";
import { ProfileStats } from "@/components/ProfileStats";
import { FollowsPanel } from "@/components/user/FollowsPanel";

export default function Profile() {
  const { id } = useParams();
  const { currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("reviews");
  
  // If no id specified, show the current user's profile
  const userId = id ? parseInt(id) : currentUser?.id;
  
  // Fetch user profile with enhanced data
  const { data: profileUser, isLoading: isUserLoading } = useQuery<UserWithStats>({
    queryKey: [userId ? `/api/users/${userId}` : "/api/me"],
    enabled: !!userId || !!currentUser,
  });
  
  // Fetch user posts/reviews
  const { data: userPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/posts`],
    enabled: !!userId,
  });

  // Fetch user's lists
  const { data: userLists, isLoading: isListsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/lists`],
    enabled: !!userId,
  });

  // Fetch user's circles
  const { data: userCircles, isLoading: isCirclesLoading } = useQuery({
    queryKey: [`/api/users/${userId}/circles`],
    enabled: !!userId,
  });

  // Fetch user's saved items
  const { data: savedItems, isLoading: isSavedLoading } = useQuery({
    queryKey: [`/api/users/${userId}/saved`],
    enabled: !!userId,
  });
  
  // Check if viewing own profile
  const isOwnProfile = currentUser && (!id || parseInt(id) === currentUser.id);

  const ProfileCover = () => (
    <div className="relative">
      {/* Cover Photo */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden">
        {profileUser?.coverImage ? (
          <img 
            src={profileUser.coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 relative">
            {/* Fun Food Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-4 left-8 text-4xl opacity-20 rotate-12">🍕</div>
              <div className="absolute top-12 right-16 text-3xl opacity-15 -rotate-6">🍔</div>
              <div className="absolute bottom-8 left-16 text-3xl opacity-20 rotate-45">🍜</div>
              <div className="absolute bottom-4 right-8 text-4xl opacity-15 -rotate-12">🍝</div>
              <div className="absolute top-20 left-1/3 text-2xl opacity-10 rotate-6">🌮</div>
              <div className="absolute bottom-16 right-1/3 text-2xl opacity-15 -rotate-12">🍱</div>
              <div className="absolute top-6 right-1/4 text-3xl opacity-10 rotate-12">🍰</div>
              <div className="absolute bottom-12 left-1/4 text-2xl opacity-20 -rotate-6">🍣</div>
            </div>
          </div>
        )}
        {isOwnProfile && (
          <Button 
            variant="secondary" 
            size="sm"
            className="absolute top-4 right-4 bg-black/20 border-white/20 text-white hover:bg-black/30"
          >
            <Camera className="h-4 w-4 mr-2" />
            Change Cover
          </Button>
        )}
      </div>

      {/* Avatar */}
      <div className="absolute -bottom-16 left-6 md:left-8">
        <div className="relative">
          <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
            <AvatarImage src={profileUser?.profilePicture} alt={profileUser?.name} />
            <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80 text-white">
              {profileUser?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {isOwnProfile && (
            <Button 
              size="sm" 
              className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-primary"
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
          
          {/* Trust Indicators */}
          <div className="absolute -top-2 -right-2 flex flex-col gap-1">
            {profileUser?.verified && (
              <Badge variant="secondary" className="bg-blue-500 text-white">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {profileUser?.topContributor && (
              <Badge variant="secondary" className="bg-yellow-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Top Contributor
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const ProfileHeader = () => (
    <div className="pt-20 pb-6 px-6 md:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1">
          {/* Name & Handle */}
          <div className="mb-3">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {profileUser?.name}
            </h1>
            <div className="flex items-center gap-2 text-gray-600">
              <span>@{profileUser?.username}</span>
              {profileUser?.preferredLocation && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profileUser.preferredLocation}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bio & Interests */}
          {profileUser?.bio && (
            <p className="text-gray-700 mb-4 max-w-2xl leading-relaxed">
              {profileUser.bio}
            </p>
          )}

          {/* Favorites */}
          {(profileUser?.favoriteFood || profileUser?.favoriteRestaurant) && (
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileUser?.favoriteFood && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <Heart className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Favorite Food</p>
                      <p className="text-gray-900 font-semibold">{profileUser.favoriteFood}</p>
                    </div>
                  </div>
                )}
                {profileUser?.favoriteRestaurant && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Favorite Restaurant</p>
                      <p className="text-gray-900 font-semibold">{profileUser.favoriteRestaurant}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cuisine Expertise */}
          {profileUser?.preferredCuisines && profileUser.preferredCuisines.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <ChefHat className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Cuisine Expertise</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profileUser.preferredCuisines.map((cuisine) => (
                  <Badge key={cuisine} variant="outline" className="bg-orange-50 border-orange-200">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Joined Date */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4" />
            <span>Joined {new Date(profileUser?.createdAt || '').toLocaleDateString('en-US', { 
              month: 'long', year: 'numeric' 
            })}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isOwnProfile ? (
            <>
              <ReferralButton 
                userId={currentUser?.id || 1}
                referralType="app"
                variant="outline"
                size="default"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Profile
              </ReferralButton>
              <Button asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="default">
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
              <FollowButton 
                userId={profileUser?.id || 0}
                initialFollowing={false}
                variant="default"
                size="default"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );

  const StatsBar = () => (
    <div className="border-y bg-gray-50">
      <div className="px-6 md:px-8 py-4">
        <div className="flex items-center justify-between md:justify-start md:gap-8">
          <ProfileStats 
            userId={profileUser?.id || 0} 
            layout="horizontal"
            showLabels={true}
          />
        </div>
      </div>
    </div>
  );

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen mb-16 md:mb-0">
        <MobileNavigation />
        <DesktopSidebar />
        <div className="flex-1 max-w-5xl mx-auto">
          <Skeleton className="h-64 w-full" />
          <div className="px-6 md:px-8 pt-20 pb-6">
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
        <div className="flex-1 max-w-5xl mx-auto px-4 py-6">
          <div className="text-center py-10">
            <p className="text-gray-500">User not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      <MobileNavigation />
      <DesktopSidebar />
      
      <div className="flex-1 max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="p-4">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Feed
          </Link>
        </div>

        {/* Profile Cover & Header */}
        <div className="bg-white rounded-t-xl overflow-hidden">
          <ProfileCover />
          <ProfileHeader />
          <StatsBar />
        </div>

        {/* Content Tabs */}
        <div className="bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 px-6 md:px-8">
              <TabsTrigger 
                value="reviews"
                className="rounded-none border-b-2 pb-3 pt-0 px-4 font-medium data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <Star className="h-4 w-4 mr-2" />
                Reviews
              </TabsTrigger>
              <TabsTrigger 
                value="lists"
                className="rounded-none border-b-2 pb-3 pt-0 px-4 font-medium data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Lists
              </TabsTrigger>
              <TabsTrigger 
                value="circles"
                className="rounded-none border-b-2 pb-3 pt-0 px-4 font-medium data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <Users className="h-4 w-4 mr-2" />
                Circles
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger 
                  value="saved"
                  className="rounded-none border-b-2 pb-3 pt-0 px-4 font-medium data-[state=active]:border-primary data-[state=active]:text-primary"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Saved
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="connections"
                className="rounded-none border-b-2 pb-3 pt-0 px-4 font-medium data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <Globe className="h-4 w-4 mr-2" />
                Connections
              </TabsTrigger>
            </TabsList>
            
            <div className="px-6 md:px-8 py-6">
              <TabsContent value="reviews" className="mt-0">
                {isPostsLoading ? (
                  <div className="space-y-6">
                    {Array(3).fill(0).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-center mb-4">
                            <Skeleton className="w-10 h-10 rounded-full mr-3" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-2" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <Skeleton className="h-20 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : userPosts && userPosts.length > 0 ? (
                  <div className="space-y-6">
                    {userPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Star className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                      <p className="text-gray-500">
                        {isOwnProfile 
                          ? "Share your first restaurant experience!" 
                          : `${profileUser.name} hasn't shared any reviews yet.`
                        }
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="lists" className="mt-0">
                <div className="text-center py-12">
                  <Bookmark className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No lists yet</h3>
                  <p className="text-gray-500">
                    {isOwnProfile 
                      ? "Create your first restaurant list!" 
                      : `${profileUser.name} hasn't created any lists yet.`
                    }
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="circles" className="mt-0">
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No circles yet</h3>
                  <p className="text-gray-500">
                    {isOwnProfile 
                      ? "Join or create your first circle!" 
                      : `${profileUser.name} isn't part of any public circles.`
                    }
                  </p>
                </div>
              </TabsContent>

              {isOwnProfile && (
                <TabsContent value="saved" className="mt-0">
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nothing saved yet</h3>
                    <p className="text-gray-500">Save restaurants and posts to find them later!</p>
                  </div>
                </TabsContent>
              )}
              
              <TabsContent value="connections" className="mt-0">
                {userId ? (
                  <FollowsPanel userId={userId} />
                ) : (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading connections...</h3>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Floating Action Button */}
        {isOwnProfile && <CreatePostButton />}
      </div>
    </div>
  );
}
