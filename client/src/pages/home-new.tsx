
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { QuickAddPanel } from "@/components/QuickAddPanel";
import { PendingInvites } from "@/components/circles/PendingInvites";
import { TabNav } from "@/components/home/TabNav";
import { ListCard } from "@/components/home/ListCard";
import { FollowRow } from "@/components/home/FollowRow";
import { EmptyState } from "@/components/home/EmptyState";
import { CircleCard } from "@/components/home/CircleCard";
import { Onboarding } from "@/components/home/Onboarding";
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
  const [showMockData, setShowMockData] = useState(false);

  // Fetch user status to determine if new user
  const { data: userStatus } = useQuery<UserStatus>({
    queryKey: [`/api/user/${user?.id}/status`],
    enabled: !!user?.id,
  });

  // Fetch feed data based on current tab
  const { data: feedData, isLoading, error } = useQuery<FeedData>({
    queryKey: [`/api/feed/${tab}`, user?.id],
    queryFn: async () => {
      const endpoint = tab === "foryou" 
        ? `/api/feed/foryou?user=${user?.id}`
        : `/api/feed/${tab}`;
      return await apiRequest(endpoint);
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Use mock data when API fails
  useEffect(() => {
    if (error) {
      setShowMockData(true);
    }
  }, [error]);

  const isNewUser = userStatus?.isNewUser || 
    (userStatus?.followCount === 0 && userStatus?.circleCount === 0);

  if (!user) {
    return null;
  }

  // Prepare content to display
  const displayLists = showMockData || !feedData?.lists?.length
    ? mockFeed.filter(item => item.type === "list") 
    : feedData.lists;

  const displayCircles = feedData?.circles || [];
  const displayFollowSuggestions = feedData?.followSuggestions || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? <MobileNavigation /> : <DesktopSidebar />}

      <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
        <div className="max-w-2xl mx-auto">
          {/* Header - Simplified and Clean */}
          <div className="bg-white border-b px-4 py-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back{user?.name ? `, ${user.name}` : ''}
              </h1>
              <p className="text-gray-600">
                Discover great restaurants from people you trust
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-4">
            <QuickAddPanel />
          </div>

          {/* Pending Invites */}
          <div className="px-4">
            <PendingInvites />
          </div>

          {/* Feed Navigation */}
          <div className="bg-white border-b sticky top-0 z-10">
            <TabNav currentTab={tab} setTab={setTab} />
          </div>

          {/* Content */}
          <div className="px-4 space-y-6 py-6">
            {isNewUser ? (
              <>
                <Onboarding />
                {displayFollowSuggestions.length > 0 && (
                  <FollowRow creators={displayFollowSuggestions} />
                )}
                {displayCircles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Popular Circles</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {displayCircles.slice(0, 3).map((circle) => (
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
                      <div key={i} className="enhanced-loading bg-white rounded-lg p-4 h-48"></div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Show API connection status if using mock data */}
                    {showMockData && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-blue-800 text-sm">
                          📡 Using demo content while connecting to server...
                        </p>
                      </div>
                    )}

                    {/* Main Feed Content */}
                    {displayLists.length > 0 ? (
                      <div className="space-y-6">
                        {displayLists.map((list, index) => (
                          <div key={`${list.id}-${index}`} className="enhanced-card">
                            <ListCard list={list} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState 
                        title="No content yet" 
                        description="Start by creating your first restaurant list or joining a circle to see content here." 
                      />
                    )}

                    {/* Follow suggestions */}
                    {displayFollowSuggestions.length > 0 && (
                      <div className="mt-8">
                        <FollowRow creators={displayFollowSuggestions} />
                      </div>
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
