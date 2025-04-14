import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Users, MessageSquare } from 'lucide-react';
import { FriendActivity } from '@/lib/types';

// Mock data - in a real app, this would come from the API
const mockFriendActivities: FriendActivity[] = [
  {
    id: 1,
    userId: 2,
    userName: 'Alex Chen',
    profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80',
    activityType: 'rated',
    targetName: 'Bella Pasta',
    targetId: 1,
    timeAgo: '2h ago',
    rating: 4.5
  },
  {
    id: 2,
    userId: 3,
    userName: 'Maya Johnson',
    profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80',
    activityType: 'joined',
    targetName: 'Hidden Gems Hub',
    targetId: 3,
    timeAgo: '3h ago'
  },
  {
    id: 3,
    userId: 4,
    userName: 'David Kim',
    profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80',
    activityType: 'posted',
    targetName: 'Sushi Delight',
    targetId: 2,
    timeAgo: '5h ago'
  }
];

export function FriendActivityFeed() {
  // In a real implementation, this would fetch from the API
  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/friend-activity'],
    enabled: false // Disabled since we're using mock data for now
  });

  // Use mock data for now
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);

  useEffect(() => {
    // In a real app, we would use the data from the API
    // For now, we'll use the mock data
    setFriendActivities(mockFriendActivities);
  }, []);

  if (isLoading) {
    return <FriendActivitySkeleton />;
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'rated':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'joined':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'posted':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getActivityLink = (activity: FriendActivity) => {
    switch (activity.activityType) {
      case 'rated':
      case 'posted':
        return `/restaurants/${activity.targetId}`;
      case 'joined':
        return `/hubs/${activity.targetId}`;
      default:
        return '#';
    }
  };

  const getActivityText = (activity: FriendActivity) => {
    switch (activity.activityType) {
      case 'rated':
        return (
          <>
            rated <Link href={getActivityLink(activity)} className="font-medium text-primary hover:underline">{activity.targetName}</Link>
            <div className="flex items-center mt-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-3 w-3 ${i < Math.floor(activity.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                />
              ))}
              <span className="text-sm ml-1">{activity.rating}</span>
            </div>
          </>
        );
      case 'joined':
        return (
          <>
            joined <Link href={getActivityLink(activity)} className="font-medium text-primary hover:underline">{activity.targetName}</Link>
          </>
        );
      case 'posted':
        return (
          <>
            posted about <Link href={getActivityLink(activity)} className="font-medium text-primary hover:underline">{activity.targetName}</Link>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">Friend Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {friendActivities.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No recent activity from friends</p>
        ) : (
          friendActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <Link href={`/profile/${activity.userId}`} className="block">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={activity.profilePicture} alt={activity.userName} />
                  <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <Link href={`/profile/${activity.userId}`} className="font-medium hover:underline">
                    {activity.userName}
                  </Link>
                  <span className="text-sm text-muted-foreground">{getActivityText(activity)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{activity.timeAgo}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {getActivityIcon(activity.activityType)}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function FriendActivitySkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-[180px]" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[180px]" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}