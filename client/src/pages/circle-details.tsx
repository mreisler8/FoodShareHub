import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Settings, 
  MapPin, 
  DollarSign, 
  Globe, 
  Lock, 
  Crown, 
  Shield, 
  UserPlus, 
  Copy, 
  Check,
  ArrowLeft,
  Star,
  List,
  MessageSquare
} from "lucide-react";
import { InviteMembersModal } from "@/components/circles/InviteMembersModal";
import { CircleFeed } from "@/components/circles/CircleFeed";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { CircleMetadata } from "@/components/circles/CircleMetadata";
import { JoinRequestList } from "@/components/circles/JoinRequestList";
import { MemberAdminPanel } from "@/components/circles/MemberAdminPanel";
import { PermissionGuard } from "@/components/circles/PermissionGuard";

interface Circle {
  id: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  memberCount: number;
  primaryCuisine?: string;
  location?: string;
  priceRange?: string;
  role?: string;
  inviteCode?: string;
  allowPublicJoin?: boolean;
  tags?: string[];
  createdAt: string;
}

interface Member {
  id: number;
  name: string;
  username: string;
  role: string;
  joinedAt: string;
  profilePicture?: string;
}

export default function CircleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");

  const { data: circle, isLoading } = useQuery<Circle>({
    queryKey: [`/api/circles/${id}`],
    enabled: !!id,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: [`/api/circles/${id}/members`],
    enabled: !!id,
  });

  const { data: lists = [] } = useQuery<any[]>({
    queryKey: [`/api/circles/${id}/lists`],
    enabled: !!id,
  });

  const handleCopyInvite = async () => {
    if (!circle?.inviteCode) return;

    try {
      const inviteLink = `${window.location.origin}/join/${circle.inviteCode}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      toast({
        title: "Invite Link Copied!",
        description: "Share this link with friends to invite them to your circle",
      });
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isMobile ? <MobileNavigation /> : <DesktopSidebar />}
        <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded mb-6"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isMobile ? <MobileNavigation /> : <DesktopSidebar />}
        <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="text-center py-12">
              <h1 className="text-xl font-medium mb-2">Circle Not Found</h1>
              <p className="text-gray-600 mb-4">This circle doesn't exist or you don't have access to it.</p>
              <Button asChild>
                <Link href="/circles">Back to Circles</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { data: currentUser } = useQuery({
    queryKey: ["/api/me"],
  });

  const isAdmin = circle.role === 'admin' || circle.role === 'owner';

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? <MobileNavigation /> : <DesktopSidebar />}

      <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/circles">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{circle.name}</h1>
                <p className="text-gray-600">{circle.description}</p>
              </div>
            </div>
            {(circle.role === 'owner' || circle.role === 'admin') && (
              <Button
                variant="outline"
                onClick={() => setInviteModalOpen(true)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite Members
              </Button>
            )}
          </div>

          {/* Circle Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-semibold">{circle.name}</h2>
                      {circle.isPrivate ? (
                        <Lock className="h-4 w-4 text-orange-600" />
                      ) : (
                        <Globe className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {circle.memberCount} members
                      </div>
                      {circle.primaryCuisine && (
                        <div className="flex items-center gap-1">
                          🍽️ {circle.primaryCuisine}
                        </div>
                      )}
                      {circle.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {circle.location}
                        </div>
                      )}
                      {circle.priceRange && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {circle.priceRange}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {circle.role && (
                    <Badge variant="secondary" className={getRoleColor(circle.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(circle.role)}
                        {circle.role}
                      </div>
                    </Badge>
                  )}
                  {circle.inviteCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyInvite}
                      className="gap-2"
                    >
                      {copiedInvite ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Invite
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {circle.description && (
              <CardContent>
                <p className="text-gray-700">{circle.description}</p>
                {circle.tags && circle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {circle.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="feed">
                <MessageSquare className="h-4 w-4 mr-2" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="lists">
                <List className="h-4 w-4 mr-2" />
                Lists ({lists.length})
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Members ({members.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-6">
              <CircleFeed circleId={circle.id} circleName={circle.name} />
            </TabsContent>

            <TabsContent value="lists" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Shared Lists</h2>
                  <Badge variant="outline">
                    {lists.length} list{lists.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {lists.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <List className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No lists shared yet</h3>
                      <p className="text-gray-600 mb-4">
                        Share your restaurant lists with this circle to help others discover great places
                      </p>
                      <Button asChild>
                        <Link href="/lists/create">Create & Share List</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {lists.map((list) => (
                      <Card key={list.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{list.name}</CardTitle>
                              <p className="text-sm text-gray-600">{list.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {list.restaurantCount || 0} restaurants
                              </Badge>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/lists/${list.id}`}>
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="members" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Members</h2>
                  <Badge variant="outline">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid gap-4">
                  {members.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-gray-600">@{member.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getRoleColor(member.role)}`}
                            >
                              <div className="flex items-center gap-1">
                                {getRoleIcon(member.role)}
                                {member.role}
                              </div>
                            </Badge>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/users/${member.id}`}>
                                View Profile
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Invite Members Modal */}
          {inviteModalOpen && (
            <InviteMembersModal
              isOpen={inviteModalOpen}
              onClose={() => setInviteModalOpen(false)}
              circle={circle}
            />
          )}
        </div>
      </div>
    </div>
  );
}