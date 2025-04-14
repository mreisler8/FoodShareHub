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
import { ArrowLeft, CalendarDays, MapPin, Settings, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserWithStats } from "@/lib/types";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function Profile() {
  const { id } = useParams();
  const { currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("posts");
  
  // If no id specified, show the current user's profile
  const userId = id ? parseInt(id) : currentUser?.id;
  
  // Fetch user profile (in a real app, this would fetch the specific user)
  const { data: profileUser, isLoading: isUserLoading } = useQuery<UserWithStats>({
    queryKey: [userId ? `/api/users/${userId}` : "/api/me"],
    enabled: !!userId || !!currentUser,
  });
  
  // Fetch user posts
  const { data: userPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: ["/api/feed"],
    // In a real app, this would fetch posts for the specific user
    // queryKey: [`/api/users/${userId}/posts`],
    enabled: !!userId || !!currentUser,
  });
  
  // Check if viewing own profile
  const isOwnProfile = currentUser && (!id || parseInt(id) === currentUser.id);
  
  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/">
            <a className="inline-flex items-center text-neutral-700 hover:text-neutral-900">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
            </a>
          </Link>
        </div>
        
        {/* Profile Header */}
        {isUserLoading ? (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="flex-1 text-center md:text-left">
                <Skeleton className="h-8 w-48 mb-2 mx-auto md:mx-0" />
                <Skeleton className="h-4 w-32 mb-4 mx-auto md:mx-0" />
                <Skeleton className="h-20 w-full mb-4" />
              </div>
            </div>
          </div>
        ) : profileUser ? (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="w-24 h-24 border-4 border-white shadow-md">
                <AvatarImage src={profileUser.profilePicture} alt={profileUser.name} />
                <AvatarFallback className="text-2xl">{profileUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                  <div>
                    <h1 className="text-2xl font-heading font-bold text-neutral-900">{profileUser.name}</h1>
                    <p className="text-neutral-500">@{profileUser.username}</p>
                  </div>
                  
                  {isOwnProfile ? (
                    <Button variant="outline" className="md:ml-auto" size="sm">
                      <Settings className="h-4 w-4 mr-2" /> Edit Profile
                    </Button>
                  ) : (
                    <Button className="md:ml-auto bg-primary text-white hover:bg-primary/90" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" /> Follow
                    </Button>
                  )}
                </div>
                
                <p className="text-neutral-700 mb-4">{profileUser.bio || "No bio yet"}</p>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-2 text-sm text-neutral-500">
                  {profileUser.postCount !== undefined && (
                    <div className="flex items-center">
                      <span className="font-semibold mr-1">{profileUser.postCount}</span> posts
                    </div>
                  )}
                  
                  {profileUser.followersCount !== undefined && (
                    <div className="flex items-center">
                      <span className="font-semibold mr-1">{profileUser.followersCount}</span> followers
                    </div>
                  )}
                  
                  {profileUser.followingCount !== undefined && (
                    <div className="flex items-center">
                      <span className="font-semibold mr-1">{profileUser.followingCount}</span> following
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" /> New York City
                  </div>
                  
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1" /> Joined 2023
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        
        {/* Profile Tabs */}
        <Tabs defaultValue="posts" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
            <TabsTrigger 
              value="posts"
              className={`rounded-none border-b-2 pb-2 pt-0 px-4 font-medium ${
                activeTab === "posts" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-200"
              }`}
            >
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="saved"
              className={`rounded-none border-b-2 pb-2 pt-0 px-4 font-medium ${
                activeTab === "saved" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-200"
              }`}
            >
              Saved
            </TabsTrigger>
            <TabsTrigger 
              value="liked"
              className={`rounded-none border-b-2 pb-2 pt-0 px-4 font-medium ${
                activeTab === "liked" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-200"
              }`}
            >
              Liked
            </TabsTrigger>
            <TabsTrigger 
              value="hubs"
              className={`rounded-none border-b-2 pb-2 pt-0 px-4 font-medium ${
                activeTab === "hubs" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-200"
              }`}
            >
              Hubs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            {isPostsLoading ? (
              <div className="space-y-6">
                {Array(2).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 flex items-center">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="ml-3 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-64 w-full" />
                  </div>
                ))}
              </div>
            ) : userPosts && userPosts.length > 0 ? (
              userPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                <p className="text-neutral-500">No posts yet.</p>
                {isOwnProfile && (
                  <p className="text-neutral-500 mt-2">Share your first restaurant experience!</p>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="saved" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <div className="text-center py-10 bg-white rounded-xl shadow-sm">
              <p className="text-neutral-500">No saved restaurants yet.</p>
              {isOwnProfile && (
                <p className="text-neutral-500 mt-2">Save restaurants to find them later!</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="liked" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <div className="text-center py-10 bg-white rounded-xl shadow-sm">
              <p className="text-neutral-500">No liked posts yet.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="hubs" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <div className="text-center py-10 bg-white rounded-xl shadow-sm">
              <p className="text-neutral-500">Not a member of any hubs yet.</p>
              {isOwnProfile && (
                <p className="text-neutral-500 mt-2">Join hubs to connect with food enthusiasts!</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Floating Action Button (only show on own profile) */}
        {isOwnProfile && <CreatePostButton />}
      </div>
    </div>
  );
}
