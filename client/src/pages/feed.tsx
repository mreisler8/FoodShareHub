import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { PostCard } from '@/components/home/PostCard';
import { PostModal } from '@/components/post/PostModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Users, Home } from 'lucide-react';
import { PostWithDetails } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface FeedPageProps {
  scope?: 'feed' | 'circle';
  circleId?: string;
}

interface PaginatedFeedResponse {
  posts: PostWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export default function FeedPage({ scope = 'feed', circleId }: FeedPageProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<PostWithDetails[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'circle'>(scope);
  const limit = 10;

  // Get user's circles for tab navigation
  const { data: userCircles = [] } = useQuery<any[]>({
    queryKey: ['/api/me/circles'],
    enabled: !!user,
  });

  // Reset posts when scope changes
  useEffect(() => {
    setAllPosts([]);
    setPage(1);
  }, [activeTab, circleId]);

  // Fetch posts based on current scope and page
  const { data: feedData, isLoading, error } = useQuery<PaginatedFeedResponse>({
    queryKey: ['/api/feed', { scope: activeTab, circleId: activeTab === 'circle' ? circleId : undefined, page }],
    enabled: !!user,
  });

  // Accumulate posts for "Load more" functionality
  useEffect(() => {
    if (feedData?.posts) {
      if (page === 1) {
        setAllPosts(feedData.posts);
      } else {
        setAllPosts(prev => [...prev, ...feedData.posts]);
      }
    }
  }, [feedData, page]);

  const handleLoadMore = () => {
    if (feedData?.pagination?.hasMore) {
      setPage(prev => prev + 1);
    }
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
            <Button 
              onClick={() => setShowPostModal(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              New Post
            </Button>
          </div>

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
                  Posts from people you follow where visibility includes feed
                </p>
                
                {isLoading && page === 1 ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : error ? (
                  <div className="text-center p-8">
                    <p className="text-red-500">Failed to load feed posts</p>
                  </div>
                ) : allPosts.length > 0 ? (
                  <>
                    <div className="space-y-6">
                      {allPosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                    
                    {feedData?.pagination?.hasMore && (
                      <div className="flex justify-center mt-6">
                        <Button 
                          onClick={handleLoadMore}
                          disabled={isLoading}
                          variant="outline"
                        >
                          {isLoading ? 'Loading...' : 'Load more'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">No posts in your feed yet</p>
                    <Button 
                      onClick={() => setShowPostModal(true)}
                      className="mt-4"
                      variant="outline"
                    >
                      Create your first post
                    </Button>
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
                      Posts shared with your circles
                    </p>
                    
                    {isLoading && page === 1 ? (
                      <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : error ? (
                      <div className="text-center p-8">
                        <p className="text-red-500">Failed to load circle posts</p>
                      </div>
                    ) : allPosts.length > 0 ? (
                      <>
                        <div className="space-y-6">
                          {allPosts.map((post) => (
                            <PostCard key={post.id} post={post} />
                          ))}
                        </div>
                        
                        {feedData?.pagination?.hasMore && (
                          <div className="flex justify-center mt-6">
                            <Button 
                              onClick={handleLoadMore}
                              disabled={isLoading}
                              variant="outline"
                            >
                              {isLoading ? 'Loading...' : 'Load more'}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-8">
                        <p className="text-muted-foreground">No posts shared with your circles yet</p>
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
      <PostModal open={showPostModal} onOpenChange={setShowPostModal} />
    </div>
  );
}