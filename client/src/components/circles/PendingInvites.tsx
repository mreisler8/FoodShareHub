import { useState } from 'react';
import { Check, X, Users, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';

interface PendingInvite {
  id: number;
  circleId: number;
  createdAt: string;
  circle: {
    id: number;
    name: string;
    description: string;
  };
  inviter: {
    id: number;
    name: string;
    username: string;
  };
}

export function PendingInvites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['/api/circles/invites/pending'],
    queryFn: () => apiRequest('/api/circles/invites/pending'),
  });

  const respondMutation = useMutation({
    mutationFn: async ({ inviteId, action }: { inviteId: number; action: 'accept' | 'decline' }) => {
      return apiRequest(`/api/circles/invites/${inviteId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === 'accept' ? 'Invite accepted!' : 'Invite declined',
        description: action === 'accept' ? 'You\'ve joined the circle' : 'Invite declined',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/circles/invites/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/circles'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to respond to invitation',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading invitations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending invitations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Invitations ({invites.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invites.map((invite: PendingInvite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{invite.circle.name}</h3>
                  <span className="text-sm text-gray-500">
                    from {invite.inviter.name}
                  </span>
                </div>
                {invite.circle.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {invite.circle.description}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Invited {new Date(invite.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondMutation.mutate({ inviteId: invite.id, action: 'decline' })}
                  disabled={respondMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => respondMutation.mutate({ inviteId: invite.id, action: 'accept' })}
                  disabled={respondMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}