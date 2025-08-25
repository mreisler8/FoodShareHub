import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

import InfiniteScroll from 'react-infinite-scroll-component';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { EnhancedModernPostCard } from '@/components/feed/EnhancedModernPostCard';
import { FeedLayoutProvider, useFeedLayout, getFeedLayoutClasses } from '@/components/feed/FeedLayoutProvider';
import { FeedViewControls } from '@/components/feed/FeedViewControls';
import { StoriesSection } from '@/components/feed/StoriesSection';
import { ModernShimmerLoader, FeedLoadingState } from '@/components/feed/ModernShimmerLoader';
import { SkeletonFeedCard, SkeletonListCard } from '@/components/ui/SkeletonFeedCard';
import { FeedSkeleton } from '@/components/ui/enhanced-skeleton';

import { InlineError } from '@/components/common/InlineError';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

import { ListFeedCard } from '@/components/lists/ListFeedCard';
import { UnifiedPostModal } from '@/components/post/UnifiedPostModal';
import { CreateCanvas } from '@/components/create/CreateCanvas';
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Users, Home, Filter, Camera, Plus, Search, User, TrendingUp, ListPlus } from 'lucide-react';
import { OptimizedPendingInvites } from '@/components/optimized/OptimizedPendingInvites';
import { PostWithDetails } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { PostTypeFeedFilter } from '@/components/feed/PostTypeFeedFilter';
import { PostType } from '@/components/post/PostTypeSelector';
import { FloatingCreateButton } from '@/components/common/FloatingCreateButton';
import { SuggestedUsersCard } from '@/components/home/SuggestedUsersCard';
import { TagExploreCard } from '@/components/home/TagExploreCard';
import { PendingInvites } from '@/components/circles/PendingInvites';
import { FollowRequestCard } from '@/components/follow/FollowRequestCard';
import { UnifiedSearchModal } from '@/components/search/UnifiedSearchModal';
import { InstagramFoodMomentModal } from '@/components/modals/InstagramFoodMomentModal';
import { EnhancedCreateListModal } from '@/components/modals/EnhancedCreateListModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'wouter';
// import { DiscoverFeed } from './DiscoverFeed'; // Temporarily removed due to import issues
import './FeedPage.css';

interface FeedPageProps {
  scope?: 'feed' | 'circle';
  circleId?: string;
}

interface FeedItem extends PostWithDetails {
  feedType: 'post' | 'list';
  // List-specific fields
  name?: string;
  description?: string;
  coverImage?: string;
  tags?: string[];
  type?: 'restaurant' | 'dish';
  audience?: 'profile' | 'circle' | 'public';
  shareWithCircle?: boolean;
  makePublic?: boolean;
  viewCount?: number;
  saveCount?: number;
  reactionCount?: number;
  updatedAt?: string;
  createdById?: number;
  creator?: {
    id: number;
    name: string;
    username: string;
    profilePicture?: string;
  };
}

interface UnifiedFeedResponse {
  items: FeedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Modern Feed Content Component with Layout Support
function FeedContentWithLayout({ allItems, onListClick }: { allItems: FeedItem[], onListClick: (id: number) => void }) {
  const { viewMode } = useFeedLayout();

  return (
    <div className={getFeedLayoutClasses(viewMode)}>
      {Array.isArray(allItems) && allItems.length > 0 ? allItems.map((item) => (
        item.feedType === 'list' ? (
          <ListFeedCard 
            key={`list-${item.id}`} 
            list={{
              id: item.id,
              name: item.name || 'Untitled List',
              description: item.description,
              coverImage: item.coverImage,
              tags: item.tags,
              type: item.type || 'restaurant',
              audience: item.audience || 'public',
              shareWithCircle: item.shareWithCircle,
              makePublic: item.makePublic,
              viewCount: item.viewCount || 0,
              saveCount: item.saveCount || 0,
              reactionCount: item.reactionCount || 0,
              createdAt: typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString(),
              updatedAt: item.updatedAt || (typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()),
              createdById: item.createdById || item.userId,
              creator: item.creator
            }}
            onListClick={onListClick}
          />
        ) : (
          <EnhancedModernPostCard 
            key={`post-${item.id}`} 
            post={item} 
            viewMode={viewMode === 'stories' ? 'list' : viewMode}
            index={allItems.indexOf(item)}
            onLike={(postId) => {
              console.log('Liked post:', postId);              // Future: Add optimistic update
            }}
            onSave={(postId) => {
              console.log('Saved post:', postId);
              // Future: Add save functionality
            }}
            onShare={(postId) => {
              if (navigator.share) {
                navigator.share({
                  title: `Check out this post by ${item.author?.name}`,
                  url: window.location.href
                });
              }
            }}
            onImageDoubleClick={() => {
              // Handle like action on double click
              console.log('Double clicked post:', item.id);
            }}
          />
        )
      )) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No posts available</p>
        </div>
      )}
    </div>
  );
}

export default function FeedPage({ scope = 'feed', circleId }: FeedPageProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCreateCanvas, setShowCreateCanvas] = useState(false);
  const [createCanvasTab, setCreateCanvasTab] = useState<'moment' | 'list'>('moment');
  const [showUnifiedShare, setShowUnifiedShare] = useState(false);
  const [shareModalTab, setShareModalTab] = useState<'moment' | 'list' | 'post'>('moment');
  const [showFoodMomentModal, setShowFoodMomentModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [isFoodMomentOpen, setIsFoodMomentOpen] = useState(false);
  const [, navigate] = useLocation();
  // Check URL parameters for tab selection
  const urlParams = new URLSearchParams(window.location.search);
  const urlTab = urlParams.get('tab');
  const initialTab = urlTab === 'discover' ? 'discover' : scope;
  const [activeTab, setActiveTab] = useState<'feed' | 'discover' | 'circle'>(initialTab);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPostTypes, setSelectedPostTypes] = useState<PostType[]>(['list', 'moment', 'dish']);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const limit = 10;

  // Get user's circles for tab navigation
  const { data: userCircles = [] } = useQuery<any[]>({
    queryKey: ['/api/me/circles'],
    enabled: !!user,
  });

  // Reset items when scope or filters change
  useEffect(() => {
    setAllItems([]);
    setPage(1);
    setHasMore(true);
  }, [activeTab, circleId, selectedPostTypes]);

  // Fetch unified feed (posts + lists) based on current scope and page - skip for discover tab
  const { data: feedData, isLoading, error } = useQuery<UnifiedFeedResponse>({
    queryKey: ['/api/unified-feed', { 
      scope: activeTab, 
      circleId: activeTab === 'circle' ? circleId : undefined, 
      page,
      postTypes: selectedPostTypes.length < 3 ? selectedPostTypes : undefined
    }],
    enabled: !!user && activeTab !== 'discover',
  });

  // Get post type counts for filter UI - skip for discover tab
  const { data: postTypeCounts } = useQuery<Record<PostType, number>>({
    queryKey: ['/api/feed/counts', { scope: activeTab, circleId: activeTab === 'circle' ? circleId : undefined }],
    enabled: !!user && activeTab !== 'discover',
  });

  // Accumulate feed items for infinite scroll
  useEffect(() => {
    if (feedData?.items) {
      if (page === 1) {
        setAllItems(feedData.items);
      } else {
        setAllItems(prev => [...prev, ...feedData.items]);
      }
      setHasMore(feedData.pagination?.hasMore ?? false);
    }
  }, [feedData, page]);

  // Fetch more feed items for infinite scroll
  const fetchMoreItems = () => {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  };

  // Handle errors for infinite scroll
  const handleError = () => {
    // You could add toast notification here
    console.error('Failed to load more feed items');
  };

  // Handle list click - navigate to list detail page
  const handleListClick = (listId: number) => {
    setLocation(`/lists/${listId}`);
  };



  const handleTabChange = (newTab: string) => {
    if (newTab === 'feed' || newTab === 'discover' || newTab === 'circle') {
      setActiveTab(newTab);
      if (newTab === 'feed') {
        setLocation('/feed');
      } else if (newTab === 'discover') {
        setLocation('/feed?tab=discover');
      } else if (userCircles.length > 0) {
        // Navigate to first circle if available
        setLocation(`/feed/circle/${userCircles[0].id}`);
      }
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please log in to view your feed</h2>
            <Button onClick={() => setLocation('/auth')}>Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FeedLayoutProvider>
      <OfflineBanner />
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />

        <div className="flex-1 overflow-auto lg:ml-0">
          {/* Stories Section - Instagram Style */}
          <StoriesSection 
            onCreateStory={() => navigate('/create-moment')}
          />

        <div className="container mx-auto px-4 py-6 pb-20 md:pb-6 pt-14">
          {/* Modern Feed Layout with Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">

            {/* Secondary Header with Search and Profile */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                {/* Header moved to AppHeader component above */}
              </div>

              <div className="flex items-center gap-3">
                {/* Universal Search Button */}
                <Button 
                  variant="outline"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border-gray-200"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </Button>

                {/* User Profile Access - CRITICAL FIX */}
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="p-2">
                    {user?.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user.name || 'Profile'} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                        {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                      </div>
                    )}
                  </Button>
                </Link>

                {!isMobile && (
                  <>
                    <FeedViewControls />
                    <Button 
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                    </Button>

                  </>
                )}
              </div>
            </div>

            {/* Prominent Search Bar */}
            <div className="mb-6">
              <Button 
                onClick={() => setIsSearchOpen(true)}
                variant="outline"
                className="w-full justify-start text-left h-12 bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Search className="h-5 w-5 mr-3 text-gray-400" />
                <span className="flex-1">Search restaurants, lists, posts, people...</span>
                <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs text-gray-500">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>

          {/* Post Type Filters */}
          {showFilters && (
            <div className="mb-6">
              <PostTypeFeedFilter
                selectedTypes={selectedPostTypes}
                onTypesChange={setSelectedPostTypes}
                postCounts={postTypeCounts}
              />
            </div>
          )}

          {/* Feed/Circle Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="feed" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="discover" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="circle" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Circle
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-6">
              <div className="space-y-4">
                {/* Quick Actions - FIXED UX: Food Moment Modal + Create List Navigation */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {/* Food Moment - Opens Instagram-Style Modal (Fixed UX) */}
                  <Button
                    onClick={() => setShowFoodMomentModal(true)}
                    variant="outline"
                    className="flex flex-col items-center p-6 h-24 w-full bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200 transition-all duration-200 touch-action-manipulation"
                  >
                    <Camera className="h-6 w-6 text-orange-600 mb-2" />
                    <span className="text-sm font-medium text-orange-800">Food Moment</span>
                  </Button>

                  {/* Create List - Opens Enhanced Modal (Fixed UX) */}
                  <Button
                    onClick={() => setShowCreateListModal(true)}
                    variant="outline"
                    className="flex flex-col items-center p-6 h-24 w-full bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200 transition-all duration-200 touch-action-manipulation"
                  >
                    <ListPlus className="h-6 w-6 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-green-800">Create List</span>
                  </Button>
                </div>

                <p className="text-muted-foreground">
                  Posts and lists from people you follow
                </p>

                {isLoading && page === 1 ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <SkeletonFeedCard key={index} />
                      ))}
                    </div>
                  ) : error ? (
                    <InlineError 
                      title="Couldn't load content"
                      message="Please check your connection and try again."
                      onRetry={() => window.location.reload()}
                      data-testid="feed-inline-error"
                    />
                  ) : allItems.length > 0 ? (
                    <InfiniteScroll
                      dataLength={allItems.length}
                      next={fetchMoreItems}
                      hasMore={hasMore}
                      loader={
                        <div className="py-6 space-y-4">
                          <SkeletonFeedCard />
                          <SkeletonFeedCard />
                        </div>
                      }
                      endMessage={
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">You've reached the end.</p>
                        </div>
                      }
                    >
                      <FeedContentWithLayout allItems={allItems} onListClick={handleListClick} />
                    </InfiniteScroll>
                  ) : (
                    <div className="text-center p-8 space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Your feed is empty</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Start following people and joining circles to see restaurant recommendations and food moments here.
                      </p>
                      <div className="flex gap-2 mt-6 justify-center">
                        <Button 
                          onClick={() => setShowFoodMomentModal(true)}
                          variant="outline"
                          className="min-h-[44px]"
                        >
                          Share a food moment
                        </Button>
                        <Button 
                          onClick={() => setLocation('/create-list')}
                          variant="outline"
                          className="min-h-[44px]"
                        >
                          Create a list
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
            </TabsContent>

            <TabsContent value="circle" className="mt-6">
              <div className="space-y-4">
                {userCircles.length === 0 ? (
                  <div className="text-center p-8 space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">No circles yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Join circles to discover restaurant recommendations from people you trust.
                    </p>
                    <Button 
                      onClick={() => setLocation('/circles')} 
                      variant="outline"
                      className="min-h-[44px]"
                    >
                      Explore Circles
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Posts and lists shared with your circles
                    </p>

                    {isLoading && page === 1 ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <SkeletonFeedCard key={index} />
                        ))}
                      </div>
                    ) : error ? (
                      <InlineError 
                        title="Couldn't load circle posts"
                        message="Please check your connection and try again."
                        onRetry={() => window.location.reload()}
                        data-testid="feed-inline-error"
                      />
                    ) : allItems.length > 0 ? (
                      <InfiniteScroll
                        dataLength={allItems.length}
                        next={fetchMoreItems}
                        hasMore={hasMore}
                        loader={
                          <div className="py-6 space-y-4">
                            <SkeletonFeedCard />
                            <SkeletonFeedCard />
                          </div>
                        }
                        endMessage={
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">You've reached the end.</p>
                          </div>
                        }
                      >
                        <div className="space-y-6">
                          {allItems.map((item) => (
                            item.feedType === 'list' ? (
                              <ListFeedCard 
                                key={`circle-list-${item.id}`} 
                                list={{
                                  id: item.id,
                                  name: item.name || 'Untitled List',
                                  description: item.description,
                                  coverImage: item.coverImage,
                                  tags: item.tags,
                                  type: item.type || 'restaurant',
                                  audience: item.audience || 'public',
                                  shareWithCircle: item.shareWithCircle,
                                  makePublic: item.makePublic,
                                  viewCount: item.viewCount || 0,
                                  saveCount: item.saveCount || 0,
                                  reactionCount: item.reactionCount || 0,
                                  createdAt: typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString(),
                                  updatedAt: item.updatedAt || (typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()),
                                  createdById: item.createdById || item.userId,
                                  creator: item.creator
                                }}
                                onListClick={handleListClick}
                              />
                            ) : (
                              <EnhancedModernPostCard 
                                key={`circle-post-${item.id}`} 
                                post={item} 
                                viewMode="list"
                                index={allItems.indexOf(item)}
                                onLike={(postId) => {
                                  console.log('Liked circle post:', postId);
                                }}
                                onSave={(postId) => {
                                  console.log('Saved circle post:', postId);
                                }}
                                onShare={(postId) => {
                                  if (navigator.share) {
                                    navigator.share({
                                      title: `Check out this circle post by ${item.author?.name}`,
                                      url: window.location.href
                                    });
                                  }
                                }}
                                onImageDoubleClick={() => {
                                  console.log('Double clicked circle post:', item.id);
                                }}
                              />
                            )
                          ))}
                        </div>
                      </InfiniteScroll>
                    ) : (
                      <div className="text-center p-8 space-y-4">
                        <div className="text-4xl mb-4">👥</div>
                        <h3 className="text-lg font-semibold text-foreground">No circle content yet</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          Circle members haven't shared any restaurant content yet. Be the first to share something!
                        </p>
                        <div className="flex gap-2 mt-6 justify-center">
                          <Button 
                            onClick={() => setShowFoodMomentModal(true)}
                            variant="outline"
                            className="min-h-[44px]"
                          >
                            Share with circle
                          </Button>
                          <Button 
                            onClick={() => navigate('/create-list')}
                            variant="outline"
                          className="min-h-[44px]"
                          >
                            Create a list
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="discover" className="mt-6">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Discover personalized recommendations from your network
                </p>

                {/* Enhanced Discover Tabs */}
                <Tabs defaultValue="for-you" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="for-you" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      For You
                    </TabsTrigger>
                    <TabsTrigger value="trending" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Trending
                    </TabsTrigger>
                    <TabsTrigger value="near-you" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Near You
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="for-you" className="mt-4">
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center">
                        <User className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                        <h3 className="font-semibold text-lg mb-2">Personalized for You</h3>
                        <p className="text-gray-600 mb-4">
                          Discover restaurants and dishes recommended by people you follow
                        </p>
                        <Button variant="outline">
                          Follow more food lovers
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="trending" className="mt-4">
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                        <h3 className="font-semibold text-lg mb-2">Trending Now</h3>
                        <p className="text-gray-600 mb-4">
                          See what's popular in the food community right now
                        </p>
                        <Button variant="outline">
                          Explore trending spots
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="near-you" className="mt-4">
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 text-center">
                        <Search className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <h3 className="font-semibold text-lg mb-2">Near You</h3>
                        <p className="text-gray-600 mb-4">
                          Find great food recommendations in your area
                        </p>
                        <Button variant="outline">
                          Enable location
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
          </div>

          {/* Right Sidebar - integrated from home page */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
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
          </div>
        </div>

        {/* Enhanced Mobile Navigation - Feed-Specific */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 backdrop-blur-md bg-white/95">
            <div className="flex justify-around py-2 px-1">
              <button 
                onClick={() => handleTabChange('feed')}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  activeTab === 'feed' 
                    ? 'text-primary bg-primary/10' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Home className="h-6 w-6" />
                <span className="text-xs font-medium">Feed</span>
              </button>
              <button 
                onClick={() => handleTabChange('discover')}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  activeTab === 'discover' 
                    ? 'text-primary bg-primary/10' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Search className="h-6 w-6" />
                <span className="text-xs font-medium">Discover</span>
              </button>
              <button 
                onClick={() => handleTabChange('circle')}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  activeTab === 'circle' 
                    ? 'text-primary bg-primary/10' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Users className="h-6 w-6" />
                <span className="text-xs font-medium">Circles</span>
              </button>
              <Link href="/profile" className="flex flex-col items-center p-2 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <User className="h-6 w-6" />
                <span className="text-xs font-medium">Profile</span>
              </Link>
            </div>
          </div>
        )}

        {/* Universal Search Modal - Feed with Priority Location */}
        <UnifiedSearchModal
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          title="Search with Location"
        />



        {/* Post Modal */}
        <UnifiedPostModal open={showPostModal} onOpenChange={setShowPostModal} />

        {/* Create Canvas Modal */}
        <CreateCanvas
          isOpen={showCreateCanvas}
          onClose={() => setShowCreateCanvas(false)}
          defaultTab={createCanvasTab}
        />

        {/* Unified Share Modal */}
        <UnifiedShareModal
          isOpen={showUnifiedShare}
          onClose={() => setShowUnifiedShare(false)}
          defaultTab={shareModalTab}
        />

        {/* Instagram-Style Food Moment Modal */}
        <InstagramFoodMomentModal
          isOpen={showFoodMomentModal}
          onClose={() => setShowFoodMomentModal(false)}
        />

        {/* Enhanced Create List Modal */}
        <EnhancedCreateListModal
          isOpen={showCreateListModal}
          onClose={() => setShowCreateListModal(false)}
        />

        {/* Enhanced Floating Create Button */}
        <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6">
            <div className="relative">
              {/* Pulsing background for prominence */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full animate-pulse opacity-20 scale-110"></div>
              <FloatingCreateButton />
            </div>
          </div>
      </div>
    </FeedLayoutProvider>
  );
}