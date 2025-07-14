import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
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
      return await apiRequest(endpoint);
    },
    enabled: !!user?.id,
  });

  const isNewUser = userStatus?.isNewUser || 
    (userStatus?.followCount === 0 && userStatus?.circleCount === 0);

  if (!user) {
    return null; // Should be handled by auth routing
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? <MobileNavigation /> : <DesktopSidebar />}

      <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white border-b sticky top-0 z-10">
            <div className="flex items-center justify-between p-4">
              <h1 className="text-2xl font-bold">Circles</h1>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>
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
                    {/* Render real feed data if available, otherwise use mock data */}
                    {feedData?.lists && feedData.lists.length > 0 ? (
                      feedData.lists.map((list) => (
                        <ListCard key={list.id} list={list} />
                      ))
                    ) : (
                      /* Render mock feed data */
                      <div className="space-y-4">
                        {mockFeed.map((item) =>
                          item.type === "list" ? (
                            <ListCard 
                              key={item.id} 
                              title={item.title}
                              image={item.image}
                              user={item.user}
                              saved={item.saved}
                              followed={item.followed}
                              restaurantCount={item.restaurantCount}
                            />
                          ) : item.type === "circle" ? (
                            <CircleCard 
                              key={item.id} 
                              name={item.name}
                              members={item.members}
                              icon={item.icon}
                              description={item.description}
                            />
                          ) : item.type === "tag" ? (
                            <div key={item.id} className="flex justify-center">
                              <TagCard tag={item.tag} />
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <SuggestedTags />
          </div>
        </div>
      </div>
    </div>
  );
}