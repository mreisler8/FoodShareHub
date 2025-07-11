import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserSearchModal } from '@/components/search/UserSearchModal';
import { InviteModal } from '@/components/circles/InviteModal';
import { Plus, Users, Settings, Share2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Circle {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  allowPublicJoin: boolean;
  inviteCode: string;
  creatorId: number;
  role: 'owner' | 'admin' | 'member';
}

interface CircleMember {
  id: number;
  userId: number;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user: {
    id: number;
    name: string;
    username: string;
    profilePicture?: string;
    bio?: string;
  };
}

interface CircleManagementProps {
  circleId: number;
  onClose?: () => void;
}

export function CircleManagement({ circleId, onClose }: CircleManagementProps) {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  console.log('CircleManagement rendering for circleId:', circleId);

  // Fetch circle details
  const { data: circle, isLoading: circleLoading } = useQuery({
    queryKey: [`/api/circles/${circleId}`],
    queryFn: () => apiRequest(`/api/circles/${circleId}`),
  });

  // Fetch circle members (only active members)
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: [`/api/circles/${circleId}/members`],
    queryFn: () => apiRequest(`/api/circles/${circleId}/members`),
  });
  
  // Fetch pending member requests for this circle
  const { data: pendingRequests = [] } = useQuery({
    queryKey: [`/api/circles/${circleId}/requests`],
    queryFn: () => apiRequest(`/api/circles/${circleId}/requests`),
    enabled: canManageMembers,
  });

  // Share circle link
  const shareCircleMutation = useMutation({
    mutationFn: async () => {
      const shareUrl = `${window.location.origin}/join/${circle?.inviteCode}`;
      await navigator.clipboard.writeText(shareUrl);
      return shareUrl;
    },
    onSuccess: () => {
      toast({
        title: 'Circle link copied!',
        description: 'The circle invite link has been copied to your clipboard.',
      });
    },
    onError: () => {
      toast({
        title: 'Error copying link',
        description: 'Failed to copy the circle invite link.',
        variant: 'destructive',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/circles/${circleId}/members/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the circle.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/members`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing member',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
    },
  });

  const handleShareCircle = () => {
    shareCircleMutation.mutate();
  };

  const handleRemoveMember = (userId: number) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      removeMemberMutation.mutate(userId);
    }
  };

  const canManageMembers = circle?.role === 'owner' || circle?.role === 'admin';
  const pendingCount = pendingRequests.filter((req: any) => req.status === 'pending').length;

  if (circleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Circle not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Circle Members</h2>
        <p className="text-gray-600 mt-1">Manage members and invite new people to your circle</p>
      </div>

      {/* Action Buttons */}
      {canManageMembers && (
        <div className="flex gap-3">
          <Button
            onClick={() => setShowUserSearch(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Members
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Send Invite
          </Button>
          <Button
            variant="outline"
            onClick={handleShareCircle}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share Circle
          </Button>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Members ({members.length})
          </h3>
          {pendingCount > 0 && canManageMembers && (
            <Badge variant="destructive" className="rounded-full">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        
        {membersLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No members yet. Invite people to join your circle!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member: CircleMember) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.user.profilePicture} alt={member.user.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {member.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-gray-900">{member.user.name}</h4>
                    <p className="text-sm text-gray-600">@{member.user.username}</p>
                    {member.user.bio && (
                      <p className="text-xs text-gray-500 mt-1">{member.user.bio}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  {canManageMembers && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Circle Info */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Invite Code: <code className="bg-gray-100 px-2 py-1 rounded">{circle.inviteCode}</code></span>
          <span>Created by: {circle.role === 'owner' ? 'You' : 'Another member'}</span>
        </div>
      </div>

      {/* Modals */}
      {showUserSearch && (
        <UserSearchModal
          isOpen={showUserSearch}
          onClose={() => setShowUserSearch(false)}
          onUserSelect={(userId) => {
            // Add user to circle logic here
            console.log('Adding user to circle:', userId);
            setShowUserSearch(false);
          }}
        />
      )}

      {showInviteModal && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          circleId={circleId}
          circleName={circle.name}
        />
      )}
    </div>
  );
}