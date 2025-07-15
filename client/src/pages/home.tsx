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
import { useState } from "react";
import "./HomePage.css";
import { FollowRequestCard } from "@/components/follow/FollowRequestCard";
import { PendingInvites } from "@/components/circles/PendingInvites";
import { UnifiedSearchModal } from "@/components/search/UnifiedSearchModal";

export default function HomePage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<HeroTabType>('for-you');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary">
                Circles
              </Link>
            </div>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Tabs */}
      <div className="pt-16">
        <HeroTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Invites */}
            {user && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FollowRequestCard />
                <PendingInvites />
              </div>
            )}

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

          {/* Sidebar */}
          <div className="space-y-6">
            <SuggestedUsersCard />
            <TagExploreCard />
          </div>
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
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
      <UnifiedSearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </div>
  );
}