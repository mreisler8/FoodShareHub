import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { HeroSection } from "@/components/HeroSection";
import { QuickAddPanel } from "@/components/QuickAddPanel";
import { PendingInvites } from "@/components/circles/PendingInvites";
import { TabNav } from "@/components/home/TabNav";
import { ListCard } from "@/components/home/ListCard";
import { FollowRow } from "@/components/home/FollowRow";
import { EmptyState } from "@/components/home/EmptyState";
import { SuggestedTags } from "@/components/home/SuggestedTags";
import { CircleCard } from "@/components/home/CircleCard";
import { Onboarding } from "@/components/home/Onboarding";
import { TagCard } from "@/components/cards/TagCard";
import { apiRequest } from "@/lib/queryClient";
import { RestaurantList, User, Circle } from "@shared/schema";
import { mockFeed } from "@/data/mockFeedData";
import "./home-new.css";

type TabType = "foryou" | "trending" | "nearby";

interface FeedData {
  lists: RestaurantList[];
  circles: Circle[];
  followSuggestions: User[];
}

interface UserStatus {
  isNewUser: boolean;
  followCount: number;
  savedCount: number;
  circleCount: number;
}

export default function Homepage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabType>("foryou");

  // Fetch user status to determine if new user
  const { data: userStatus } = useQuery<UserStatus>({
    queryKey: [`/api/user/${user?.id}/status`],
    enabled: !!user?.id,
  });

  // Fetch feed data based on current tab
  const { data: feedData, isLoading } = useQuery<FeedData>({
    queryKey: [`/api/feed/${tab}`, user?.id],
    queryFn: async () => {
      const endpoint = tab === "foryou" 
        ? `/api/feed/foryou?user=${user?.id}`
        : `/api/feed/${tab}`;
      try {
        return await apiRequest(endpoint);
      } catch (error) {
        console.error(`Error fetching ${tab} feed:`, error);
        // Return mock data when API fails
        return {
          lists: mockFeed.filter(item => item.type === "list"),
          circles: [],
          followSuggestions: []
        };
      }
    },
    enabled: !!user?.id,
  });

  const isNewUser = userStatus?.isNewUser || 
    (userStatus?.followCount === 0 && userStatus?.circleCount === 0);

  if (!user) {
    return null; // Should be handled by auth routing
  }

  // Get featured content for hero section
  const getFeaturedContent = () => {
    if (feedData?.lists && feedData.lists.length > 0) {
      return feedData.lists[0];
    }
    return mockFeed.find(item => item.type === "list");
  };

  const featuredContent = getFeaturedContent();

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? <MobileNavigation /> : <DesktopSidebar />}

      <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
        <div className="max-w-2xl mx-auto">
          {/* Hero Section - Key Design Element */}
          <HeroSection />

          {/* Quick Actions Panel - Key Functionality */}
          <div className="px-4 py-4">
            <QuickAddPanel />
          </div>

          {/* Pending Invites - Social Features */}
          <div className="px-4">
            <PendingInvites />
          </div>

          {/* Feed Navigation */}
          <div className="bg-white border-b sticky top-0 z-10">
            <TabNav currentTab={tab} setTab={setTab} />
          </div>

          {/* Content */}
          <div className="px-4 space-y-6 py-4">
            {isNewUser ? (
              <>
                <Onboarding />
                {feedData?.followSuggestions && feedData.followSuggestions.length > 0 ? (
                  <FollowRow creators={feedData.followSuggestions} />
                ) : null}
                {feedData?.circles && feedData.circles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Popular Circles</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {feedData.circles.slice(0, 3).map((circle) => (
                        <CircleCard key={circle.id} circle={circle} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                        <div className="bg-gray-200 h-36 rounded-md mb-4"></div>
                        <div className="bg-gray-200 h-4 rounded mb-2"></div>
                        <div className="bg-gray-200 h-3 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Render feed data with fallback to mock data */}
                    {feedData?.lists && feedData.lists.length > 0 ? (
                      feedData.lists.map((list) => (
                        <ListCard key={list.id} list={list} />
                      ))
                    ) : (
                      /* Use mock data when API is unavailable */
                      <div className="space-y-4">
                        {mockFeed.map((item) =>
                          item.type === "list" ? (
                            <ListCard key={item.id} list={item} />
                          ) : null
                        )}
                      </div>
                    )}

                    {/* Follow suggestions at the bottom */}
                    {feedData?.followSuggestions && feedData.followSuggestions.length > 0 && (
                      <div className="mt-8">
                        <FollowRow creators={feedData.followSuggestions} />
                      </div>
                    )}

                    {/* Empty state if no content */}
                    {(!feedData?.lists || feedData.lists.length === 0) && 
                     (!mockFeed || mockFeed.length === 0) && (
                      <EmptyState 
                        title="No content yet" 
                        description="Start by creating your first restaurant list or joining a circle to see content here." 
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
