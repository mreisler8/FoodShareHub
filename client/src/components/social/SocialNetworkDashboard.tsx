import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  Target, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Star,
  MessageCircle,
  Shield,
  Activity
} from 'lucide-react';

interface SocialActivity {
  id: number;
  type: 'circle_invite' | 'follow_request' | 'circle_member_request';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  actionRequired: boolean;
  data: any;
  expiresAt: string;
}

interface SocialMetrics {
  following: number;
  followers: number;
  circles: number;
  ownedCircles: number;
  pendingFollowRequests: number;
  pendingCircleInvites: number;
}

interface NetworkHealth {
  score: number;
  level: 'high' | 'medium' | 'low';
  recommendations: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

export function SocialNetworkDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch social activity feed
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['/api/social/activity'],
    queryFn: async () => {
      const response = await fetch('/api/social/activity');
      if (!response.ok) throw new Error('Failed to fetch social activity');
      return response.json();
    },
  });

  // Fetch social analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/social/analytics'],
    queryFn: async () => {
      const response = await fetch('/api/social/analytics');
      if (!response.ok) throw new Error('Failed to fetch social analytics');
      return response.json();
    },
  });

  const activities: SocialActivity[] = activityData?.activities || [];
  const metrics: SocialMetrics = analyticsData?.socialMetrics || {};
  const networkHealth: NetworkHealth = analyticsData?.networkHealth || { score: 0, level: 'low', recommendations: [] };

  const renderActivityItem = (activity: SocialActivity) => {
    const getIcon = () => {
      switch (activity.type) {
        case 'circle_invite':
          return <Users className="h-4 w-4" />;
        case 'follow_request':
          return <UserPlus className="h-4 w-4" />;
        case 'circle_member_request':
          return <Shield className="h-4 w-4" />;
        default:
          return <Activity className="h-4 w-4" />;
      }
    };

    const getPriorityColor = () => {
      switch (activity.priority) {
        case 'high':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'low':
          return 'bg-green-100 text-green-800 border-green-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getTitle = () => {
      switch (activity.type) {
        case 'circle_invite':
          return `Circle Invitation: ${activity.data.circle.name}`;
        case 'follow_request':
          return `Follow Request from ${activity.data.follower.name}`;
        case 'circle_member_request':
          return `Member Request for ${activity.data.circle.name}`;
        default:
          return 'Social Activity';
      }
    };

    return (
      <Card key={activity.id} className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getIcon()}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{getTitle()}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {activity.type === 'circle_invite' && (
                    <>Invited by {activity.data.inviter.name} • {activity.data.circle.memberCount} members</>
                  )}
                  {activity.type === 'follow_request' && (
                    <>@{activity.data.follower.username} • {activity.data.follower.bio}</>
                  )}
                  {activity.type === 'circle_member_request' && (
                    <>{activity.data.user.name} wants to join • @{activity.data.user.username}</>
                  )}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getPriorityColor()}>
                    {activity.priority} priority
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            {activity.actionRequired && (
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button size="sm" variant="outline">
                  Decline
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (activityLoading || analyticsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Social Network Dashboard</h1>
        <p className="text-gray-600">Enterprise-grade social networking features and analytics</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network Size</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.followers + metrics.following}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.followers} followers • {metrics.following} following
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Circles</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.circles}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.ownedCircles} owned • {metrics.circles - metrics.ownedCircles} member
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.pendingFollowRequests + metrics.pendingCircleInvites}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.pendingFollowRequests} follow requests • {metrics.pendingCircleInvites} invites
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Network Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Engagement Score</span>
                    <span className={`text-sm font-medium ${getHealthColor(networkHealth.level)}`}>
                      {networkHealth.score}/100 ({networkHealth.level})
                    </span>
                  </div>
                  <Progress value={networkHealth.score} className="h-2" />
                </div>
                
                {networkHealth.recommendations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <div className="space-y-2">
                      {networkHealth.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                          <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm text-blue-900">{rec.message}</p>
                            <Badge variant="outline" className="mt-1">
                              {rec.priority} priority
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Social Activity</CardTitle>
              <p className="text-sm text-gray-600">
                {activities.length} pending activities requiring your attention
              </p>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending social activities</p>
                  <p className="text-sm text-gray-500 mt-1">
                    You're all caught up with your social network!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map(renderActivityItem)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Social Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Followers</span>
                    <span className="font-medium">{metrics.followers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Following</span>
                    <span className="font-medium">{metrics.following}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Circles</span>
                    <span className="font-medium">{metrics.circles}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Owned Circles</span>
                    <span className="font-medium">{metrics.ownedCircles}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Network Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Social Reach</span>
                    <span className="font-medium">{analyticsData?.insights?.socialReach || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Network Growth</span>
                    <Badge variant={analyticsData?.insights?.networkGrowth === 'active' ? 'default' : 'secondary'}>
                      {analyticsData?.insights?.networkGrowth || 'unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Influence Level</span>
                    <Badge variant={analyticsData?.insights?.influence === 'leader' ? 'default' : 'secondary'}>
                      {analyticsData?.insights?.influence || 'participant'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Engagement Score</span>
                    <span className="font-medium">{networkHealth.score}/100</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}