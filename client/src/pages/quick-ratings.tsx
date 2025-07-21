import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, TrendingUp, Users, MapPin, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RatingsList from '@/components/ratings/RatingsList';
import QuickRateButton from '@/components/ratings/QuickRateButton';

export default function QuickRatingsPage() {
  const [activeTab, setActiveTab] = useState('my-ratings');

  // Get user's ratings summary
  const { data: ratingSummary } = useQuery({
    queryKey: ['/api/ratings/summary'],
    queryFn: async () => {
      const response = await fetch('/api/ratings?limit=1000');
      const ratings = await response.json();
      
      const totalRatings = ratings.length;
      const avgRating = totalRatings > 0 
        ? ratings.reduce((sum: number, r: any) => sum + r.ratingValue, 0) / totalRatings
        : 0;
      const sharedRatings = ratings.filter((r: any) => !r.isPrivate).length;
      
      return {
        totalRatings,
        averageRating: avgRating,
        sharedRatings,
        recentRatings: ratings.slice(0, 5)
      };
    }
  });

  // Get trending restaurants from the community
  const { data: trendingRestaurants = [] } = useQuery({
    queryKey: ['/api/restaurants/trending'],
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                Quick Ratings
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Rate restaurants quickly and share with your circles
              </p>
            </div>
            
            <QuickRateButton
              restaurant={{
                name: "Search restaurants...",
                location: "Start rating"
              }}
              variant="default"
              className="hidden md:flex"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        {ratingSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Total Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {ratingSummary.totalRatings}
                </div>
                <p className="text-sm text-gray-600">
                  Avg: {ratingSummary.averageRating.toFixed(1)}★
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Shared Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {ratingSummary.sharedRatings}
                </div>
                <p className="text-sm text-gray-600">
                  {ratingSummary.totalRatings > 0 
                    ? Math.round((ratingSummary.sharedRatings / ratingSummary.totalRatings) * 100)
                    : 0}% shared
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {ratingSummary.recentRatings.length}
                </div>
                <p className="text-sm text-gray-600">
                  Recent ratings
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="my-ratings">My Ratings</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="circles">Circle Ratings</TabsTrigger>
          </TabsList>

          <TabsContent value="my-ratings" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Restaurant Ratings</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
                <QuickRateButton
                  restaurant={{
                    name: "Find restaurant...",
                    location: ""
                  }}
                  variant="default"
                  className="md:hidden"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rating
                </QuickRateButton>
              </div>
            </div>

            <RatingsList 
              showActions={true}
              className="space-y-4"
            />
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Trending Restaurants</h2>
              <p className="text-gray-600 mb-6">
                Popular restaurants in your network that you haven't rated yet
              </p>
            </div>

            {trendingRestaurants.length > 0 ? (
              <div className="grid gap-4">
                {trendingRestaurants.slice(0, 10).map((restaurant: any) => (
                  <Card key={restaurant.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {restaurant.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          {restaurant.location || restaurant.city}
                          {restaurant.cuisine && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {restaurant.cuisine}
                            </Badge>
                          )}
                        </div>
                        {restaurant.avgRating && (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < Math.floor(restaurant.avgRating)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              {restaurant.avgRating.toFixed(1)} • {restaurant.ratingCount} ratings
                            </span>
                          </div>
                        )}
                      </div>
                      <QuickRateButton
                        restaurant={restaurant}
                        variant="compact"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No trending restaurants yet
                </h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  Follow more users and join circles to see popular restaurants in your network
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="circles" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Circle Ratings</h2>
              <p className="text-gray-600 mb-6">
                See what restaurants your circles are rating and sharing
              </p>
            </div>

            {/* This would show ratings from all user's circles */}
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No circle ratings yet
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                Join circles and encourage members to share their restaurant ratings
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Quick Rate FAB */}
      <div className="fixed bottom-20 right-4 md:hidden">
        <QuickRateButton
          restaurant={{
            name: "Rate a restaurant",
            location: ""
          }}
          className="rounded-full w-14 h-14 shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </QuickRateButton>
      </div>
    </div>
  );
}