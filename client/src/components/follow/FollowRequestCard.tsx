import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Users, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

interface FollowRequest {
  id: number;
  followerId: number;
  follower: {
    id: number;
    name: string;
    username: string;
    profilePicture?: string;
    bio?: string;
  };
  status: string;
  createdAt: string;
}

export function FollowRequestCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending follow requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['/api/follow/requests/pending'],
  });

  // Accept/decline follow request mutation
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'accept' | 'decline' }) => {
      return apiRequest(`/api/follow/requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === 'accept' ? 'Follow request accepted!' : 'Follow request declined',
        description: action === 'accept' ? 'You have a new follower.' : 'The request has been declined.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/follow/requests/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to respond to follow request',
        variant: 'destructive',
      });
    },
  });

  const handleResponse = (requestId: number, action: 'accept' | 'decline') => {
    respondToRequestMutation.mutate({ requestId, action });
  };

  const pendingCount = requests.filter((req: FollowRequest) => req.status === 'pending').length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Follow Requests
          </span>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="rounded-full">
              {pendingCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.slice(0, 3).map((request: FollowRequest) => (
          <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Link href={`/profile/${request.follower.id}`}>
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.follower.profilePicture} alt={request.follower.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {request.follower.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-sm">{request.follower.name}</h4>
                  <p className="text-xs text-gray-600">@{request.follower.username}</p>
                </div>
              </div>
            </Link>
            {request.status === 'pending' && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => handleResponse(request.id, 'accept')}
                  disabled={respondToRequestMutation.isPending}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3"
                  onClick={() => handleResponse(request.id, 'decline')}
                  disabled={respondToRequestMutation.isPending}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {requests.length > 3 && (
          <Link href="/notifications">
            <Button variant="ghost" className="w-full text-sm">
              View all {requests.length} requests
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}