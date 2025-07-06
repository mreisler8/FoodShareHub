import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { DesktopRightSidebar } from "@/components/navigation/DesktopRightSidebar";
import { QuickCaptureButton } from "@/components/shared/QuickCaptureButton";
import { Bell, MessageSquare, Users, Utensils, Bookmark, PlusCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { WelcomeSplash } from "@/components/onboarding/WelcomeSplash";
import { QuickAddRestaurant } from "@/components/restaurant/QuickAddRestaurant";
import { PostCard } from "@/components/home/PostCard";
import { PostModal } from "@/components/post/PostModal";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PostWithDetails } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, Link } from "wouter";

export default function Home() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [, setLocation] = useLocation();
  
  // Check if user has joined any circles
  const { data: userCircles = [], isLoading: isLoadingCircles } = useQuery<any[]>({
    queryKey: ["/api/me/circles"],
    enabled: !!user,
  });
  
  // Check if user has any restaurant lists
  const { data: userLists = [], isLoading: isLoadingLists } = useQuery<any[]>({
    queryKey: ["/api/lists"],
    enabled: !!user,
  });
  
  // Fetch posts for the feed with pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Define a type for the paginated feed response
  interface PaginatedFeedResponse {
    posts: PostWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    }
  }
  
  const { 
    data: feedData, 
    isLoading: isLoadingFeed 
  } = useQuery<PaginatedFeedResponse>({
    queryKey: ["/api/feed", { page, limit }],
    enabled: !!user,
  });
  
  // Extract posts and pagination data with defaults for safety
  const feedPosts = feedData?.posts || [];
  const pagination = feedData?.pagination || { 
    page: 1, 
    limit: 10, 
    total: 0, 
    totalPages: 1, 
    hasMore: false 
  };
  
  // Show onboarding modal for new users
  useEffect(() => {
    if (user && !isLoadingCircles && !isLoadingLists) {
      // Check localStorage for onboarding completion
      const hasCompletedOnboarding = localStorage.getItem(`onboarding-completed-${user.id}`);
      
      // If user has no circles and no lists and hasn't completed onboarding, they're likely a new user
      if (userCircles.length === 0 && userLists.length === 0 && !hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user, userCircles, userLists, isLoadingCircles, isLoadingLists]);

  // Use the hook to conditionally render elements
  const isMobile = useIsMobile();
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - only on desktop */}
      {!isMobile && <DesktopSidebar />}
      
      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-3 py-4 pb-20 md:pb-6 md:px-6 lg:px-8 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between mb-4 sticky top-0 bg-background z-20 py-3 -mx-3 px-3 border-b border-border/50">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity" aria-label="Go to home page">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 11h.01"></path>
                <path d="M11 15h.01"></path>
                <path d="M16 16h.01"></path>
                <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"></path>
                <path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"></path>
              </svg>
            </div>
            <h1 className="ml-2 text-xl font-heading font-bold text-neutral-900 truncate">Circles</h1>
          </Link>
          <div className="flex items-center -mr-1">
            <button className="p-2 touch-manipulation rounded-full hover:bg-accent">
              <Bell className="text-neutral-700 h-5 w-5" />
            </button>
            <button className="p-2 ml-1 touch-manipulation rounded-full hover:bg-accent">
              <MessageSquare className="text-neutral-700 h-5 w-5" />
            </button>
          </div>
        </header>
        
        {/* Welcome/Getting Started Section - for new users */}
        {(userCircles.length === 0 || userLists.length === 0) && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Welcome, {user?.name || "there"}!</h2>
              <p className="text-muted-foreground">Get started with Circles by joining or creating:</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {userCircles.length === 0 && (
                <EmptyState
                  title="Join Your First Circle"
                  description="Connect with friends and trusted food lovers to get restaurant recommendations."
                  icon={Users}
                  actionLabel="Join a Circle"
                  actionHref="/discover"
                  secondaryActionLabel="Create a Circle"
                  secondaryActionHref="/circles/create"
                />
              )}
              
              {userLists.length === 0 && (
                <EmptyState
                  title="Create Your First List"
                  description="Start collecting and sharing your favorite restaurants with your circles."
                  icon={Bookmark}
                  actionLabel="Create a List"
                  actionHref="/lists/create"
                />
              )}
            </div>
          </div>
        )}
        
        {/* Quick Add Section - Easily add restaurants and dishes */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <QuickAddRestaurant />
            
            {/* Quick Create List */}
            <div className="bg-card rounded-lg p-3 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <PlusCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm text-foreground truncate">Create List</h3>
                  <p className="text-xs text-muted-foreground truncate">Curate favorites</p>
                </div>
              </div>
              <Button 
                onClick={() => setLocation('/lists/create')} 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
              >
                Create New List
              </Button>
            </div>
          </div>
        </div>

        {/* Feed Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Latest Posts</h2>
            <Button 
              onClick={() => setShowPostModal(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5"
              size="sm"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Post</span>
              <span className="sm:hidden">Post</span>
            </Button>
          </div>
          
          {isLoadingFeed ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : feedPosts.length > 0 ? (
            <>
              <div className="space-y-6">
                {feedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={!pagination.hasMore}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No Posts Yet"
              description="Follow friends or join circles to see posts in your feed, or create your first post."
              icon={PlusCircle}
              actionLabel="Create a Post"
              actionHref="/create-post"
            />
          )}
        </div>
        
        {/* Explore Section - for all users */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Explore</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EmptyState
              title="Discover Places"
              description="Find new restaurants based on recommendations from your circles."
              icon={Utensils}
              actionLabel="Browse Restaurants"
              actionHref="/discover"
            />
            
            <EmptyState
              title="Join Circles"
              description="Connect with friends or join public circles of food enthusiasts."
              icon={Users}
              actionLabel="Find Circles"
              actionHref="/discover"
            />
            
            <EmptyState
              title="Share Experiences"
              description="Post your dining experiences and add to your lists."
              icon={PlusCircle}
              actionLabel="Add an Experience"
              actionHref="/create-post"
            />
          </div>
        </div>
        
        {/* Floating Action Button for Quick Capture */}
        <QuickCaptureButton />
      </div>
      
      {/* Right Sidebar (Desktop Only) */}
      <DesktopRightSidebar />
      
      {/* Welcome Splash for first-time users */}
      <WelcomeSplash onCreateFirstCircle={() => setLocation("/circles")} />
      
      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      
      {/* Post Modal */}
      <PostModal open={showPostModal} onOpenChange={setShowPostModal} />
      
      {/* Mobile navigation at bottom of screen - only on mobile */}
      {isMobile && <MobileNavigation />}
    </div>
  );
}
