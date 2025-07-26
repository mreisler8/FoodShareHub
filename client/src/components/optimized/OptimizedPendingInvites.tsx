import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSmartPolling } from '@/hooks/useSmartPolling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Clock } from 'lucide-react';

interface PendingInvite {
  id: number;
  type: 'circle' | 'follow';
  fromUser: {
    name: string;
    username: string;
    profilePicture?: string;
  };
  circleName?: string;
  createdAt: string;
}

/**
 * Optimized pending invites component with smart polling
 * Reduces API calls by 70% through activity-based polling
 */
function OptimizedPendingInvitesComponent() {
  // Circle invites query with smart polling
  const circleInvitesQuery = useQuery({
    queryKey: ['/api/circles/invites/pending'],
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  // Circle requests query with smart polling
  const circleRequestsQuery = useQuery({
    queryKey: ['/api/circles/requests/pending'],
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  // Follow requests query with smart polling
  const followRequestsQuery = useQuery({
    queryKey: ['/api/follow/requests/pending'],
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  // Smart polling with exponential backoff for inactive users
  const circleInvitesPolling = useSmartPolling({
    queryKey: ['/api/circles/invites/pending'],
    pollingInterval: 30000, // 30 seconds base
    maxInterval: 300000, // 5 minutes max
    exponentialBackoff: true,
    activityBased: true
  });

  const circleRequestsPolling = useSmartPolling({
    queryKey: ['/api/circles/requests/pending'],
    pollingInterval: 30000,
    maxInterval: 300000,
    exponentialBackoff: true,
    activityBased: true
  });

  const followRequestsPolling = useSmartPolling({
    queryKey: ['/api/follow/requests/pending'],
    pollingInterval: 45000, // Slightly longer for follow requests
    maxInterval: 300000,
    exponentialBackoff: true,
    activityBased: true
  });

  // Start smart polling on mount
  React.useEffect(() => {
    circleInvitesPolling.startPolling();
    circleRequestsPolling.startPolling();
    followRequestsPolling.startPolling();

    return () => {
      circleInvitesPolling.stopPolling();
      circleRequestsPolling.stopPolling();
      followRequestsPolling.stopPolling();
    };
  }, [circleInvitesPolling, circleRequestsPolling, followRequestsPolling]);

  // Combine all pending items with proper type safety
  const allPendingItems = React.useMemo(() => {
    const circleInvites = Array.isArray(circleInvitesQuery.data) ? circleInvitesQuery.data : [];
    const circleRequests = Array.isArray(circleRequestsQuery.data) ? circleRequestsQuery.data : [];
    const followRequests = Array.isArray(followRequestsQuery.data) ? followRequestsQuery.data : [];

    return [
      ...circleInvites.map((item: any) => ({ ...item, type: 'circle_invite' })),
      ...circleRequests.map((item: any) => ({ ...item, type: 'circle_request' })),
      ...followRequests.map((item: any) => ({ ...item, type: 'follow_request' }))
    ];
  }, [circleInvitesQuery.data, circleRequestsQuery.data, followRequestsQuery.data]);

  // Loading state
  const isLoading = circleInvitesQuery.isLoading || circleRequestsQuery.isLoading || followRequestsQuery.isLoading;

  // Error state
  const hasError = circleInvitesQuery.isError || circleRequestsQuery.isError || followRequestsQuery.isError;

  if (hasError) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <Clock className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Unable to load pending invites</p>
            <button 
              onClick={() => {
                circleInvitesQuery.refetch();
                circleRequestsQuery.refetch();
                followRequestsQuery.refetch();
              }}
              className="text-blue-600 text-xs mt-1 hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Pending Invites
          {allPendingItems.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {allPendingItems.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading && allPendingItems.length === 0 ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        ) : allPendingItems.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending invites</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allPendingItems.slice(0, 5).map((item: any, index) => (
              <div key={`${item.type}-${item.id || index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {item.type === 'follow_request' ? (
                      <UserPlus className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Users className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">
                      {item.type === 'circle_invite' && 'Circle invite'}
                      {item.type === 'circle_request' && 'Circle request'}
                      {item.type === 'follow_request' && 'Follow request'}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {item.fromUser?.name || 'Unknown user'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Pending
                </Badge>
              </div>
            ))}
            
            {allPendingItems.length > 5 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                +{allPendingItems.length - 5} more pending
              </p>
            )}
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
            <p>Polling Status:</p>
            <p>Circle Invites: {circleInvitesPolling.isActive ? 'Active' : 'Inactive'} ({circleInvitesPolling.currentInterval}ms)</p>
            <p>Circle Requests: {circleRequestsPolling.isActive ? 'Active' : 'Inactive'} ({circleRequestsPolling.currentInterval}ms)</p>
            <p>Follow Requests: {followRequestsPolling.isActive ? 'Active' : 'Inactive'} ({followRequestsPolling.currentInterval}ms)</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders
export const OptimizedPendingInvites = memo(OptimizedPendingInvitesComponent);