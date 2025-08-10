import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { HeroTabs, type HeroTabType } from "@/components/home/HeroTabs";
import { ModernListCard } from "@/components/home/ModernListCard";
import { SuggestedUsersCard } from "@/components/home/SuggestedUsersCard";
import { TagExploreCard } from "@/components/home/TagExploreCard";
import { EmptyFeed } from "@/components/home/EmptyFeed";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Search, Home, Compass, Users, User } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import "./HomePage.css";
import { FollowRequestCard } from "@/components/follow/FollowRequestCard";
import { PendingInvites } from "@/components/circles/PendingInvites";
import { OptimizedSearchModal } from "@/components/search/OptimizedSearchModal";
import { FloatingCreateButton } from "@/components/create/FloatingCreateButton";
import { UnifiedPostModal } from "@/components/post/UnifiedPostModal";
import { CreateCanvas } from "@/components/create/CreateCanvas";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<HeroTabType>('for-you');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCreateCanvas, setShowCreateCanvas] = useState(false);
  const [createCanvasTab, setCreateCanvasTab] = useState<'moment' | 'list'>('moment');

  // Redirect authenticated users to feed
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/feed');
    }
  }, [user, isLoading, navigate]);

  // Query for lists based on active tab
  const { data: lists, isLoading: listsLoading } = useQuery({
    queryKey: ['/api/lists', activeTab],
    queryFn: async () => {
      // Transform data based on active tab
      const response = await fetch('/api/lists');
      const data = await response.json();
      
      // For now, return all lists - in production this would be filtered by tab
      return data.map((list: any) => ({
        ...list,
        createdBy: { name: 'User', username: 'username' }, // Mock user data
        restaurantCount: Math.floor(Math.random() * 20) + 1,
        saveCount: Math.floor(Math.random() * 100),
        viewCount: Math.floor(Math.random() * 500)
      }));
    },
  });

  const hasContent = lists && lists.length > 0;

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show marketing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
      {/* Hero Tabs */}
      <div className="pt-2">
        <HeroTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/create-post" className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <div className="text-3xl mb-2">🍕</div>
                  <span className="text-sm font-medium">Post Experience</span>
                </Link>
                <Link href="/create-list" className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <div className="text-3xl mb-2">📝</div>
                  <span className="text-sm font-medium">Create List</span>
                </Link>
                <Link href="/create-circle" className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                  <div className="text-3xl mb-2">👥</div>
                  <span className="text-sm font-medium">Create Circle</span>
                </Link>
                <Link href="/circles" className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <div className="text-3xl mb-2">🔗</div>
                  <span className="text-sm font-medium">Your Circles</span>
                </Link>
              </div>
            </div>

            {/* Welcome to Circles */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 rounded-xl border p-6">
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">❤️</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Circles!
                </h2>
                <p className="text-gray-600">
                  Follow some foodie travelers to get personalized recommendations
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Find People to Follow
                </button>
                <Link href="/discover">
                  <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Compass className="h-4 w-4" />
                    Explore
                  </button>
                </Link>
              </div>
            </div>

            {/* Lists Feed */}
            {listsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="animate-pulse">
                      <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : hasContent ? (
              <div className="space-y-6">
                {lists?.map((list: any) => (
                  <ModernListCard key={list.id} list={list} />
                ))}
              </div>
            ) : (
              <EmptyFeed />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Pending Invites & Requests */}
            {user && (
              <div className="space-y-4">
                <PendingInvites />
                <FollowRequestCard />
              </div>
            )}
            
            <SuggestedUsersCard />
            <TagExploreCard />
          </div>
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
          <div className="flex justify-around py-2">
            <Link href="/" className="flex flex-col items-center p-2">
              <Home className="h-6 w-6 text-primary" />
              <span className="text-xs text-primary font-medium">Home</span>
            </Link>
            <Link href="/discover" className="flex flex-col items-center p-2">
              <Compass className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-400">Explore</span>
            </Link>
            <Link href="/circles" className="flex flex-col items-center p-2">
              <Users className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-400">Circles</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center p-2">
              <User className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-400">Profile</span>
            </Link>
          </div>
        </div>
      )}

      {/* Unified Search Modal */}
      <OptimizedSearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        searchType="unified"
        showLocationServices={true}
        placeholder="Search restaurants, lists, posts, people…"
      />

      {/* Post Modal */}
      <UnifiedPostModal
        open={showPostModal}
        onOpenChange={setShowPostModal}
      />

      {/* Create Canvas */}
      <CreateCanvas
        isOpen={showCreateCanvas}
        onClose={() => setShowCreateCanvas(false)}
        defaultTab={createCanvasTab}
      />

      
      </div>
    );
  }

  // Authenticated users are redirected, this shouldn't render
  return null;
}