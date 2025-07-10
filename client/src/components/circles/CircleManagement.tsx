import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('members');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch circle details
  const { data: circle, isLoading: circleLoading } = useQuery({
    queryKey: [`/api/circles/${circleId}`],
    queryFn: () => apiRequest(`/api/circles/${circleId}`),
  });

  // Fetch circle members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: [`/api/circles/${circleId}/members`],
    queryFn: () => apiRequest(`/api/circles/${circleId}/members`),
  });

  // Fetch user's circles for the search modal
  const { data: userCircles = [] } = useQuery({
    queryKey: ['/api/me/circles'],
    queryFn: () => apiRequest('/api/me/circles'),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{circle.name}</h2>
          <p className="text-muted-foreground">{circle.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={circle.isPrivate ? 'secondary' : 'default'}>
            {circle.isPrivate ? 'Private' : 'Public'}
          </Badge>
          <Badge variant="outline">
            {circle.memberCount} members
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invite">Invite</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Circle Members</h3>
            {canManageMembers && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserSearch(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Members
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            )}
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member: CircleMember) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user.profilePicture} alt={member.user.name} />
                          <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{member.user.name}</h4>
                          <p className="text-sm text-muted-foreground">@{member.user.username}</p>
                          {member.user.bio && (
                            <p className="text-xs text-muted-foreground mt-1">{member.user.bio}</p>
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
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Circle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Share this link to invite people to your circle:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm">
                    {window.location.origin}/join/{circle.inviteCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareCircle}
                    disabled={shareCircleMutation.isPending}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {canManageMembers && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Send Email Invite
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUserSearch(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Find & Add Users
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Circle Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Privacy</label>
                  <p className="text-sm text-muted-foreground">
                    {circle.isPrivate ? 'Private circle' : 'Public circle'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Public Join</label>
                  <p className="text-sm text-muted-foreground">
                    {circle.allowPublicJoin ? 'Anyone can join' : 'Invite only'}
                  </p>
                </div>
              </div>
              
              {canManageMembers && (
                <div className="pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Circle Settings
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        showAddToCircle={true}
        availableCircles={[{ id: circleId, name: circle.name }]}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        circleId={circleId}
        circleName={circle.name}
      />
    </div>
  );
}