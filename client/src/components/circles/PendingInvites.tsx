import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Clock, UserPlus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PendingInvite {
  id: number;
  circleId: number;
  circle: {
    id: number;
    name: string;
    description: string;
    memberCount: number;
  };
  inviter: {
    id: number;
    name: string;
    username: string;
    profilePicture?: string;
  };
  status: string;
  createdAt: string;
}

interface PendingMemberRequest {
  id: number;
  circleId: number;
  userId: number;
  user: {
    id: number;
    name: string;
    username: string;
    profilePicture?: string;
    bio?: string;
  };
  status: string;
  requestedAt: string;
}

export function PendingInvites() {
  const [activeTab, setActiveTab] = useState('invites');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending invites for current user
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['/api/circles/invites/pending'],
  });

  // Fetch pending member requests for circles user owns/admins
  const { data: memberRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/circles/requests/pending'],
  });

  // Accept/decline invite mutation
  const respondToInviteMutation = useMutation({
    mutationFn: async ({ inviteId, action }: { inviteId: number; action: 'accept' | 'decline' }) => {
      return apiRequest(`/api/circles/invites/${inviteId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === 'accept' ? 'Invitation accepted!' : 'Invitation declined',
        description: action === 'accept' ? 'You have joined the circle.' : 'The invitation has been declined.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/circles/invites/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/circles'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to respond to invitation',
        variant: 'destructive',
      });
    },
  });

  // Approve/reject member request mutation
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'approve' | 'reject' }) => {
      return apiRequest(`/api/circles/requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === 'approve' ? 'Member approved!' : 'Request rejected',
        description: action === 'approve' ? 'The user has been added to the circle.' : 'The request has been rejected.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/circles/requests/pending'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to respond to request',
        variant: 'destructive',
      });
    },
  });

  const handleInviteResponse = (inviteId: number, action: 'accept' | 'decline') => {
    respondToInviteMutation.mutate({ inviteId, action });
  };

  const handleRequestResponse = (requestId: number, action: 'approve' | 'reject') => {
    respondToRequestMutation.mutate({ requestId, action });
  };

  const pendingInvitesCount = invites.filter((inv: PendingInvite) => inv.status === 'pending').length;
  const pendingRequestsCount = memberRequests.filter((req: PendingMemberRequest) => req.status === 'pending').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Invitations & Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invites" className="relative">
              Circle Invites
              {pendingInvitesCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {pendingInvitesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Member Requests
              {pendingRequestsCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {pendingRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="space-y-4 mt-4">
            {invitesLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No pending invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite: PendingInvite) => (
                  <div key={invite.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={invite.inviter.profilePicture} alt={invite.inviter.name} />
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {invite.inviter.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {invite.inviter.name} invited you to join
                        </h4>
                        <p className="text-sm text-gray-600">{invite.circle.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {invite.circle.memberCount} members • {new Date(invite.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {invite.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleInviteResponse(invite.id, 'accept')}
                          disabled={respondToInviteMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInviteResponse(invite.id, 'decline')}
                          disabled={respondToInviteMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                    {invite.status !== 'pending' && (
                      <Badge variant={invite.status === 'accepted' ? 'default' : 'secondary'}>
                        {invite.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4 mt-4">
            {requestsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : memberRequests.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No pending member requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memberRequests.map((request: PendingMemberRequest) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.user.profilePicture} alt={request.user.name} />
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {request.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-gray-900">{request.user.name}</h4>
                        <p className="text-sm text-gray-600">@{request.user.username}</p>
                        {request.user.bio && (
                          <p className="text-xs text-gray-500 mt-1">{request.user.bio}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Requested {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRequestResponse(request.id, 'approve')}
                          disabled={respondToRequestMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRequestResponse(request.id, 'reject')}
                          disabled={respondToRequestMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {request.status !== 'pending' && (
                      <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                        {request.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}