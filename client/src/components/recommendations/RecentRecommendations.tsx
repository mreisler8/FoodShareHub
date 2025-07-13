import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/home/PostCard';
import { 
  Filter, 
  MapPin, 
  ChefHat, 
  DollarSign, 
  TrendingUp,
  Users,
  Calendar,
  Star
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RecommendationFilters {
  cuisine?: string;
  location?: string;
  priceRange?: string;
  theme?: string;
}

export function RecentRecommendations() {
  const [filters, setFilters] = useState<RecommendationFilters>({});
  const [activeTab, setActiveTab] = useState('recent');

  // Get recent recommendations
  const { data: recentData, isLoading: isRecentLoading } = useQuery({
    queryKey: ['/api/recommendations/recent', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/recommendations/recent?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    },
  });

  // Get trending recommendations
  const { data: trendingData, isLoading: isTrendingLoading } = useQuery({
    queryKey: ['/api/recommendations/trending'],
  });

  // Get circle recommendations
  const { data: circleData, isLoading: isCircleLoading } = useQuery({
    queryKey: ['/api/recommendations/by-circle'],
  });

  // Get filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['/api/recommendations/filters'],
  });

  const handleFilterChange = (key: keyof RecommendationFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recent Recommendations</h2>
          <p className="text-gray-600">Discover what people you follow are recommending</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cuisine</label>
              <select
                value={filters.cuisine || 'all'}
                onChange={(e) => handleFilterChange('cuisine', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="all">All Cuisines</option>
                {filterOptions?.cuisines?.map((cuisine: string) => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <select
                value={filters.location || 'all'}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="all">All Locations</option>
                {filterOptions?.locations?.map((location: string) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Price Range</label>
              <select
                value={filters.priceRange || 'all'}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="all">All Prices</option>
                {filterOptions?.priceRanges?.map((range: string) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select
                value={filters.theme || 'all'}
                onChange={(e) => handleFilterChange('theme', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="all">All Themes</option>
                <option value="date-night">Date Night</option>
                <option value="family">Family Friendly</option>
                <option value="business">Business Lunch</option>
                <option value="casual">Casual Dining</option>
                <option value="special-occasion">Special Occasion</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {recentData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Recommendations</p>
                  <p className="text-2xl font-bold">{recentData.summary.totalRecommendations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Top Cuisine</p>
                  <p className="text-lg font-semibold">
                    {Object.entries(recentData.summary.byCuisine).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Popular Area</p>
                  <p className="text-lg font-semibold">
                    {Object.entries(recentData.summary.byLocation).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Common Price</p>
                  <p className="text-lg font-semibold">
                    {Object.entries(recentData.summary.byPriceRange).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="circles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Circles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          {isRecentLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center mb-4">
                      <Skeleton className="w-10 h-10 rounded-full mr-3" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentData?.recommendations?.length > 0 ? (
            <div className="space-y-4">
              {recentData.recommendations.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Recommendations</h3>
                <p className="text-gray-500">
                  Start following people to see their restaurant recommendations here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          {isTrendingLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : trendingData?.length > 0 ? (
            <div className="grid gap-4">
              {trendingData.map((restaurant: any) => (
                <Card key={restaurant.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                        <p className="text-gray-600 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {restaurant.location}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="secondary">{restaurant.cuisine}</Badge>
                          <Badge variant="outline">{restaurant.priceRange}</Badge>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm">{Number(restaurant.avgRating).toFixed(1)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {restaurant.mentionCount} mentions from {restaurant.recommendedBy?.length} people
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Trending Recommendations</h3>
                <p className="text-gray-500">
                  Follow more people to see trending restaurants in your network.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="circles" className="space-y-4">
          {isCircleLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : circleData?.length > 0 ? (
            <div className="space-y-4">
              {circleData.map((post: any) => (
                <div key={post.id} className="relative">
                  <PostCard post={post} />
                  <Badge className="absolute top-2 right-2 bg-blue-100 text-blue-800">
                    {post.circle.name}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Circle Recommendations</h3>
                <p className="text-gray-500">
                  Join circles to see recommendations from your food communities.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}