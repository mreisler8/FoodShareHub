import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Users, Activity, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    slowRequestRate: number;
    errorRate: number;
  };
  topSlowEndpoints: Array<{
    endpoint: string;
    avgTime: number;
    count: number;
    errorRate: number;
  }>;
}

interface UserAnalytics {
  listPerformance: Array<{
    id: number;
    name: string;
    restaurant_count: number;
    save_count: number;
    reaction_count: number;
    view_count: number;
    engagement_rate: number;
  }>;
  circleInsights: Array<{
    id: number;
    name: string;
    member_count: number;
    shared_lists: number;
    shared_posts: number;
    activity_rate: number;
  }>;
  restaurantDiscovery: Array<{
    id: number;
    name: string;
    category: string;
    user_ratings: number;
    list_appearances: number;
    total_engagement: number;
  }>;
}

export function PerformanceDashboard() {
  const { data: performance } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/analytics/performance'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: userAnalytics } = useQuery<UserAnalytics>({
    queryKey: ['/api/analytics/user-data'],
    queryFn: async () => {
      const [lists, circles, restaurants] = await Promise.all([
        fetch('/api/analytics/lists/performance').then(r => r.json()),
        fetch('/api/analytics/circles/insights').then(r => r.json()),
        fetch('/api/analytics/restaurants/discovery').then(r => r.json())
      ]);
      return { listPerformance: lists, circleInsights: circles, restaurantDiscovery: restaurants };
    },
    staleTime: 300000, // 5 minutes
  });

  if (!performance || !userAnalytics) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Badge variant={performance.summary.avgResponseTime < 300 ? "default" : "destructive"}>
          {performance.summary.avgResponseTime < 300 ? "Healthy" : "Needs Attention"}
        </Badge>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{performance.summary.avgResponseTime}ms</p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <Progress 
              value={Math.min((performance.summary.avgResponseTime / 1000) * 100, 100)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{performance.summary.totalRequests.toLocaleString()}</p>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Slow Requests</p>
                <p className="text-2xl font-bold">{performance.summary.slowRequestRate.toFixed(1)}%</p>
              </div>
              {performance.summary.slowRequestRate > 10 ? (
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{performance.summary.errorRate.toFixed(1)}%</p>
              </div>
              {performance.summary.errorRate > 5 ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <TrendingUp className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slow Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Slowest Endpoints</CardTitle>
          <CardDescription>API endpoints that need optimization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performance.topSlowEndpoints.slice(0, 5).map((endpoint, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{endpoint.endpoint}</p>
                  <p className="text-xs text-muted-foreground">{endpoint.count} requests</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{Math.round(endpoint.avgTime)}ms</p>
                  {endpoint.errorRate > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {endpoint.errorRate.toFixed(1)}% errors
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Engagement Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Lists</CardTitle>
            <CardDescription>Your most engaging content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userAnalytics.listPerformance.slice(0, 5).map((list) => (
                <div key={list.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{list.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {list.restaurant_count} restaurants • {list.save_count} saves • {list.view_count} views
                    </p>
                  </div>
                  <Badge variant="outline">
                    {list.engagement_rate} engagement/day
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Circle Activity</CardTitle>
            <CardDescription>Your most active circles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userAnalytics.circleInsights.slice(0, 5).map((circle) => (
                <div key={circle.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{circle.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {circle.member_count} members • {circle.shared_lists} lists • {circle.shared_posts} posts
                    </p>
                  </div>
                  <Badge variant="outline">
                    {circle.activity_rate} activity/day
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restaurant Discovery */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Discovery</CardTitle>
          <CardDescription>Your most engaged restaurants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userAnalytics.restaurantDiscovery.slice(0, 6).map((restaurant) => (
              <div key={restaurant.id} className="p-4 border rounded-lg">
                <h4 className="font-medium">{restaurant.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{restaurant.category}</p>
                <div className="flex justify-between text-xs">
                  <span>{restaurant.user_ratings} ratings</span>
                  <span>{restaurant.list_appearances} list appearances</span>
                </div>
                <Progress value={(restaurant.total_engagement / 10) * 100} className="mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}