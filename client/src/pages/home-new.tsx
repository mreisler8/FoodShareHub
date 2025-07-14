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
      return await apiRequest(endpoint);
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
    <div className="enhanced-home-background">
      {isMobile ? <MobileNavigation /> : <DesktopSidebar />}

      <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
        <div className="max-w-2xl mx-auto">
          {/* Enhanced Dynamic Hero Section */}
          <div className="enhanced-header sticky top-0 z-10">
            <div className="px-4 py-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold gradient-title">
                    Circles
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">
                    {tab === "foryou" ? "Your personalized feed" : 
                     tab === "trending" ? "What's trending now" : 
                     "Discover nearby"}
                  </p>
                </div>
                <div className="enhanced-avatar w-10 h-10 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* Featured Content Preview */}
              {featuredContent && (
                <div className="featured-card mb-4 p-4 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className="featured-icon w-16 h-16 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🍽️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Featured: {featuredContent.title || featuredContent.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {featuredContent.user?.name && `by ${featuredContent.user.name}`}
                        {featuredContent.restaurantCount && ` • ${featuredContent.restaurantCount} restaurants`}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="content-badge px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Trending
                        </span>
                        <span className="text-xs text-gray-500">
                          {tab === "foryou" ? "For You" : tab}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Enhanced Tab Navigation */}
            <div className="enhanced-tabs border-t">
              <TabNav currentTab={tab} setTab={setTab} />
            </div>
          </div>

          {/* Enhanced Content Section */}
          <div className="px-4 space-y-6 py-6">
            {isNewUser ? (
              <>
                {/* Enhanced Onboarding */}
                <div className="enhanced-card rounded-2xl p-6">
                  <Onboarding />
                </div>
                
                {feedData?.followSuggestions && feedData.followSuggestions.length > 0 ? (
                  <div className="enhanced-card rounded-2xl p-6">
                    <FollowRow creators={feedData.followSuggestions} />
                  </div>
                ) : null}
                
                {feedData?.circles && feedData.circles.length > 0 && (
                  <div className="enhanced-card rounded-2xl p-6">
                    <div className="section-header flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Popular Circles</h3>
                      <span className="text-sm text-blue-600 font-medium">Discover</span>
                    </div>
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
                  /* Enhanced Loading States */
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="enhanced-card rounded-2xl p-6">
                        <div className="animate-pulse">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="enhanced-loading w-10 h-10 rounded-full"></div>
                            <div className="flex-1">
                              <div className="enhanced-loading h-4 rounded mb-2"></div>
                              <div className="enhanced-loading h-3 rounded w-1/2"></div>
                            </div>
                          </div>
                          <div className="enhanced-loading h-48 rounded-xl mb-4"></div>
                          <div className="enhanced-loading h-4 rounded mb-2"></div>
                          <div className="enhanced-loading h-3 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Enhanced Feed Rendering */}
                    {feedData?.lists && feedData.lists.length > 0 ? (
                      <div className="space-y-6">
                        {feedData.lists.map((list) => (
                          <div key={list.id} className="enhanced-card rounded-2xl">
                            <ListCard list={list} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Enhanced Mock Data Rendering */
                      <div className="space-y-6">
                        {mockFeed.map((item) =>
                          item.type === "list" ? (
                            <div key={item.id} className="enhanced-card rounded-2xl">
                              <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="user-avatar-gradient w-10 h-10 rounded-full flex items-center justify-center">
                                      <span className="text-white text-sm font-medium">
                                        {item.user?.name?.charAt(0)?.toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{item.user?.name}</p>
                                      <p className="text-sm text-gray-600">{item.user?.handle}</p>
                                    </div>
                                  </div>
                                  <span className="list-badge content-badge px-3 py-1 text-xs font-medium rounded-full">
                                    List by @{item.user?.handle?.replace('@', '')}
                                  </span>
                                </div>
                                <ListCard 
                                  key={item.id} 
                                  title={item.title}
                                  image={item.image}
                                  user={item.user}
                                  saved={item.saved}
                                  followed={item.followed}
                                  restaurantCount={item.restaurantCount}
                                />
                              </div>
                            </div>
                          ) : item.type === "circle" ? (
                            <div key={item.id} className="enhanced-card rounded-2xl">
                              <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <span className="circle-badge content-badge px-3 py-1 text-xs font-medium rounded-full">
                                    Circle
                                  </span>
                                </div>
                                <CircleCard 
                                  key={item.id} 
                                  name={item.name}
                                  members={item.members}
                                  icon={item.icon}
                                  description={item.description}
                                />
                              </div>
                            </div>
                          ) : item.type === "tag" ? (
                            <div key={item.id} className="enhanced-card rounded-2xl">
                              <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <span className="tag-badge content-badge px-3 py-1 text-xs font-medium rounded-full">
                                    Trending Tag
                                  </span>
                                </div>
                                <div className="flex justify-center">
                                  <TagCard tag={item.tag} />
                                </div>
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
                    )}

                    {/* Enhanced Follow Suggestions */}
                    {feedData?.followSuggestions && feedData.followSuggestions.length > 0 && (
                      <div className="enhanced-card rounded-2xl p-6 mt-8">
                        <div className="section-header flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900">Discover People</h3>
                          <span className="text-sm text-blue-600 font-medium">View All</span>
                        </div>
                        <FollowRow creators={feedData.followSuggestions} />
                      </div>
                    )}

                    {/* Enhanced Empty State */}
                    {(!feedData?.lists || feedData.lists.length === 0) && 
                     (!mockFeed || mockFeed.length === 0) && (
                      <div className="enhanced-empty-state rounded-2xl p-12 text-center">
                        <div className="empty-state-icon w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">🍽️</span>
                        </div>
                        <EmptyState 
                          title="Your feed is empty" 
                          description="Start by creating your first restaurant list or joining a circle to see content here." 
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Enhanced Suggested Tags */}
            <div className="enhanced-card rounded-2xl p-6">
              <div className="section-header mb-4">
                <h3 className="text-xl font-bold text-gray-900">Trending Topics</h3>
              </div>
              <SuggestedTags />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}