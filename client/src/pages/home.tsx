import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { DesktopRightSidebar } from "@/components/navigation/DesktopRightSidebar";
import { QuickCaptureButton } from "@/components/shared/QuickCaptureButton";
import { Bell, MessageSquare, Users, Utensils, Bookmark, PlusCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check if user has joined any circles
  const { data: userCircles = [], isLoading: isLoadingCircles } = useQuery({
    queryKey: ["/api/circles/user"],
    enabled: !!user,
  });
  
  // Check if user has any restaurant lists
  const { data: userLists = [], isLoading: isLoadingLists } = useQuery({
    queryKey: ["/api/lists/user"],
    enabled: !!user,
  });
  
  // Show onboarding modal for new users
  useEffect(() => {
    if (user && !isLoadingCircles && !isLoadingLists) {
      // If user has no circles and no lists, they're likely a new user
      if (userCircles.length === 0 && userLists.length === 0) {
        setShowOnboarding(true);
      }
    }
  }, [user, userCircles, userLists, isLoadingCircles, isLoadingLists]);

  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between mb-6">
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
            <button className="p-2">
              <Bell className="text-neutral-700 h-5 w-5" />
            </button>
            <button className="p-2 ml-1">
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
    </div>
  );
}
