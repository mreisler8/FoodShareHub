import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import InfiniteScroll from 'react-infinite-scroll-component';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { PostCard } from '@/components/home/PostCard';
import { ListFeedCard } from '@/components/lists/ListFeedCard';
import { UnifiedPostModal } from '@/components/post/UnifiedPostModal';
import { Button } from '@/components/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Users, Home, Filter } from 'lucide-react';
import { PostWithDetails } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { PostTypeFeedFilter } from '@/components/feed/PostTypeFeedFilter';
import { PostType } from '@/components/post/PostTypeSelector';
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

export default function FeedPage({ scope = 'feed', circleId }: FeedPageProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'circle'>(scope);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPostTypes, setSelectedPostTypes] = useState<PostType[]>(['list', 'moment', 'dish']);
  const [showFilters, setShowFilters] = useState(false);
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

  // Fetch unified feed (posts + lists) based on current scope and page
  const { data: feedData, isLoading, error } = useQuery<UnifiedFeedResponse>({
    queryKey: ['/api/unified-feed', { 
      scope: activeTab, 
      circleId: activeTab === 'circle' ? circleId : undefined, 
      page,
      postTypes: selectedPostTypes.length < 3 ? selectedPostTypes : undefined
    }],
    enabled: !!user,
  });

  // Get post type counts for filter UI
  const { data: postTypeCounts } = useQuery<Record<PostType, number>>({
    queryKey: ['/api/feed/counts', { scope: activeTab, circleId: activeTab === 'circle' ? circleId : undefined }],
    enabled: !!user,
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
    if (newTab === 'feed' || newTab === 'circle') {
      setActiveTab(newTab);
      if (newTab === 'feed') {
        setLocation('/feed');
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
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {activeTab === 'feed' ? 'Your Feed' : 'Circle Feed'}
            </h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button 
                onClick={() => setShowPostModal(true)}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                New Post
              </Button>
            </div>
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="feed" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="circle" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Circle
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="feed" className="mt-6">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Posts and lists from people you follow
                </p>
                
                {isLoading && page === 1 ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : error ? (
                  <div className="text-center p-8">
                    <p className="text-red-500">Failed to load feed posts</p>
                  </div>
                ) : allItems.length > 0 ? (
                  <InfiniteScroll
                    dataLength={allItems.length}
                    next={fetchMoreItems}
                    hasMore={hasMore}
                    loader={
                      <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                            onListClick={handleListClick}
                          />
                        ) : (
                          <PostCard key={`post-${item.id}`} post={item} />
                        )
                      ))}
                    </div>
                  </InfiniteScroll>
                ) : (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">No posts or lists in your feed yet</p>
                    <div className="flex gap-2 mt-4 justify-center">
                      <Button 
                        onClick={() => setShowPostModal(true)}
                        variant="outline"
                      >
                        Create your first post
                      </Button>
                      <Button 
                        onClick={() => setLocation('/create-list')}
                        variant="outline"
                      >
                        Create your first list
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="circle" className="mt-6">
              <div className="space-y-4">
                {userCircles.length === 0 ? (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground mb-4">You're not part of any circles yet</p>
                    <Button onClick={() => setLocation('/circles')} variant="outline">
                      Join a Circle
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Posts and lists shared with your circles
                    </p>
                    
                    {isLoading && page === 1 ? (
                      <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : error ? (
                      <div className="text-center p-8">
                        <p className="text-red-500">Failed to load circle posts</p>
                      </div>
                    ) : allItems.length > 0 ? (
                      <InfiniteScroll
                        dataLength={allItems.length}
                        next={fetchMoreItems}
                        hasMore={hasMore}
                        loader={
                          <div className="flex justify-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                              <PostCard key={`circle-post-${item.id}`} post={item} />
                            )
                          ))}
                        </div>
                      </InfiniteScroll>
                    ) : (
                      <div className="text-center p-8">
                        <p className="text-muted-foreground">No posts or lists shared with your circles yet</p>
                        <div className="flex gap-2 mt-4 justify-center">
                          <Button 
                            onClick={() => setShowPostModal(true)}
                            variant="outline"
                          >
                            Create a post
                          </Button>
                          <Button 
                            onClick={() => setLocation('/create-list')}
                            variant="outline"
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
          </Tabs>
        </div>
      </div>

      <MobileNavigation />
      
      {/* Post Modal */}
      <UnifiedPostModal open={showPostModal} onOpenChange={setShowPostModal} />
    </div>
  );
}