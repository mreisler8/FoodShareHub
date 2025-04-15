import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { DesktopRightSidebar } from "@/components/navigation/DesktopRightSidebar";
import { QuickCaptureButton } from "@/components/shared/QuickCaptureButton";
import { Bell, MessageSquare, Users, Utensils, Bookmark, PlusCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { QuickAddRestaurant } from "@/components/restaurant/QuickAddRestaurant";
import { PostCard } from "@/components/home/PostCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PostWithDetails } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check if user has joined any circles
  const { data: userCircles = [], isLoading: isLoadingCircles } = useQuery<any[]>({
    queryKey: ["/api/circles/user"],
    enabled: !!user,
  });
  
  // Check if user has any restaurant lists
  const { data: userLists = [], isLoading: isLoadingLists } = useQuery<any[]>({
    queryKey: ["/api/lists/user"],
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
    <div className="flex min-h-screen">
      {/* Desktop Sidebar - only on desktop */}
      {!isMobile && <DesktopSidebar />}
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6 md:px-8">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-background z-10 pt-2">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 11h.01"></path>
                <path d="M11 15h.01"></path>
                <path d="M16 16h.01"></path>
                <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"></path>
                <path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"></path>
              </svg>
            </div>
            <h1 className="ml-3 text-2xl font-heading font-bold text-neutral-900">Circles</h1>
          </div>
          <div className="flex items-center">
            <button className="p-3 touch-manipulation">
              <Bell className="text-neutral-700 h-5 w-5" />
            </button>
            <button className="p-3 ml-1 touch-manipulation">
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
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="mb-4">
            <QuickAddRestaurant />
          </div>
        </div>

        {/* Feed Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Latest Posts</h2>
          
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
      
      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      
      {/* Mobile navigation at bottom of screen - only on mobile */}
      {isMobile && <MobileNavigation />}
    </div>
  );
}
