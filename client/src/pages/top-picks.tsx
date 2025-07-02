import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { PostCard } from '@/components/home/PostCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Star, Heart, MessageCircle, MapPin, Utensils } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface TopPicksData {
  restaurants?: Array<{
    id: number;
    name: string;
    location: string;
    category: string;
    averageRating: number;
    totalPosts: number;
    imageUrl?: string;
    type: 'restaurant';
  }>;
  posts?: Array<{
    id: number;
    content: string;
    rating: number;
    likeCount: number;
    commentCount: number;
    author: {
      id: number;
      name: string;
      username: string;
    };
    restaurant: {
      id: number;
      name: string;
      location: string;
    };
    createdAt: string;
    type: 'post';
  }>;
}

interface TopPicksResponse {
  category: string;
  limit: number;
  data: TopPicksData;
  timestamp: string;
}

export default function TopPicksPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'all' | 'restaurants' | 'posts'>('all');

  // Fetch top picks based on selected category
  const { data: topPicksData, isLoading, error } = useQuery<TopPicksResponse>({
    queryKey: ['/api/top-picks', { category: activeTab }],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please log in to view top picks</h2>
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
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Top Picks</h1>
              <p className="text-muted-foreground">Discover the most popular restaurants and posts in your community</p>
            </div>
          </div>

          {/* Category Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'restaurants' | 'posts')} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="restaurants" className="flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Restaurants
              </TabsTrigger>
              <TabsTrigger value="posts" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Posts
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <div className="space-y-8">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : error ? (
                  <div className="text-center p-8">
                    <p className="text-red-500">Failed to load top picks</p>
                  </div>
                ) : (
                  <>
                    {/* Top Restaurants */}
                    {topPicksData?.data.restaurants && topPicksData.data.restaurants.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Utensils className="h-5 w-5 text-primary" />
                          <h2 className="text-xl font-semibold">Top Restaurants</h2>
                          <Badge variant="secondary">{topPicksData.data.restaurants.length}</Badge>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {topPicksData.data.restaurants.map((restaurant) => (
                            <Card key={restaurant.id} className="cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => setLocation(`/restaurants/${restaurant.id}`)}>
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                      <MapPin className="h-3 w-3" />
                                      <span className="text-sm">{restaurant.location}</span>
                                    </div>
                                  </div>
                                  <Badge variant="outline">{restaurant.category}</Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-medium">{Number(restaurant.averageRating).toFixed(1)}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {restaurant.totalPosts} posts
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Posts */}
                    {topPicksData?.data.posts && topPicksData.data.posts.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Heart className="h-5 w-5 text-primary" />
                          <h2 className="text-xl font-semibold">Top Posts</h2>
                          <Badge variant="secondary">{topPicksData.data.posts.length}</Badge>
                        </div>
                        <div className="space-y-6">
                          {topPicksData.data.posts.map((post) => (
                            <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => setLocation(`/posts/${post.id}`)}>
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="flex items-center gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`h-4 w-4 ${
                                              i < post.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-sm text-muted-foreground">
                                        by {post.author.name}
                                      </span>
                                    </div>
                                    <CardTitle className="text-lg">{post.restaurant.name}</CardTitle>
                                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                      <MapPin className="h-3 w-3" />
                                      <span className="text-sm">{post.restaurant.location}</span>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-muted-foreground mb-3 line-clamp-2">{post.content}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-4 w-4" />
                                    <span>{post.likeCount}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{post.commentCount}</span>
                                  </div>
                                  <span>•</span>
                                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {!topPicksData?.data.restaurants?.length && !topPicksData?.data.posts?.length && (
                      <div className="text-center p-8">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No top picks available yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Start creating posts and rating restaurants to see top picks!
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="restaurants" className="mt-6">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : topPicksData?.data.restaurants && topPicksData.data.restaurants.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {topPicksData.data.restaurants.map((restaurant) => (
                      <Card key={restaurant.id} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setLocation(`/restaurants/${restaurant.id}`)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                <span className="text-sm">{restaurant.location}</span>
                              </div>
                            </div>
                            <Badge variant="outline">{restaurant.category}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{Number(restaurant.averageRating).toFixed(1)}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {restaurant.totalPosts} posts
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No top restaurants available yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="posts" className="mt-6">
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : topPicksData?.data.posts && topPicksData.data.posts.length > 0 ? (
                  topPicksData.data.posts.map((post) => (
                    <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setLocation(`/posts/${post.id}`)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < post.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                by {post.author.name}
                              </span>
                            </div>
                            <CardTitle className="text-lg">{post.restaurant.name}</CardTitle>
                            <div className="flex items-center gap-1 text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              <span className="text-sm">{post.restaurant.location}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-3 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{post.likeCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.commentCount}</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center p-8">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No top posts available yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
}