import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { ShareListModal } from "@/components/circles/ShareListModal";
import { 
  ArrowLeft, 
  Users, 
  Share2, 
  Settings, 
  Copy,
  Plus,
  MoreVertical,
  Calendar,
  MapPin,
  DollarSign,
  ChefHat
} from "lucide-react";

interface CircleDetail {
  id: number;
  name: string;
  description?: string;
  memberCount: number;
  isPrivate: boolean;
  inviteCode?: string;
  allowPublicJoin?: boolean;
  createdAt: string;
  creatorId: number;
  primaryCuisine?: string;
  priceRange?: string;
  location?: string;
  members?: Array<{
    id: number;
    name: string;
    username: string;
    profilePicture?: string;
    role: string;
  }>;
  sharedLists?: Array<{
    id: number;
    name: string;
    description?: string;
    restaurantCount: number;
    createdBy: {
      id: number;
      name: string;
    };
    sharedAt: string;
  }>;
}

export default function CircleDetailsV2Page() {
  const isMobile = useIsMobile();
  const params = useParams();
  const circleId = params.id ? parseInt(params.id) : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showShareListModal, setShowShareListModal] = useState(false);

  const { data: circle, isLoading } = useQuery<CircleDetail>({
    queryKey: [`/api/circles/${circleId}`],
    enabled: !!circleId,
  });

  const { data: sharedLists = [] } = useQuery({
    queryKey: [`/api/circles/${circleId}/lists`],
    enabled: !!circleId,
  });

  const copyInviteLink = () => {
    if (circle?.inviteCode) {
      navigator.clipboard.writeText(`${window.location.origin}/join/${circle.inviteCode}`);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    }
  };

  const isOwner = circle?.creatorId === user?.id;

  if (!circleId) {
    return <div>Invalid circle ID</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {!isMobile && <DesktopSidebar />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {isLoading ? (
            <div className="animate-pulse p-6">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : circle ? (
            <>
              {/* Header */}
              <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Link href="/circles">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                      </Link>
                      <div>
                        <h1 className="text-2xl font-bold">{circle.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {circle.memberCount} members
                          </span>
                          {circle.primaryCuisine && (
                            <span className="flex items-center gap-1">
                              <ChefHat className="h-4 w-4" />
                              {circle.primaryCuisine}
                            </span>
                          )}
                          {circle.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {circle.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <Link href={`/circles/${circleId}/members`}>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </Link>
                      )}
                      <Button size="sm" onClick={copyInviteLink}>
                        <Copy className="h-4 w-4 mr-2" />
                        Invite
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Description */}
                {circle.description && (
                  <Card className="p-6 mb-6">
                    <h2 className="font-semibold mb-2">About</h2>
                    <p className="text-gray-600">{circle.description}</p>
                  </Card>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Shared Lists</p>
                        <p className="text-2xl font-semibold">{sharedLists.length}</p>
                      </div>
                      <Share2 className="h-8 w-8 text-gray-300" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Restaurants</p>
                        <p className="text-2xl font-semibold">
                          {sharedLists.reduce((acc, list) => acc + (list.restaurantCount || 0), 0)}
                        </p>
                      </div>
                      <MapPin className="h-8 w-8 text-gray-300" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Created</p>
                        <p className="text-lg font-semibold">
                          {new Date(circle.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-gray-300" />
                    </div>
                  </Card>
                </div>

                {/* Shared Lists */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Shared Lists</h2>
                    <Button size="sm" onClick={() => setShowShareListModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Share List
                    </Button>
                  </div>

                  {sharedLists.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="font-medium mb-2">No lists shared yet</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Be the first to share a restaurant list with this circle
                      </p>
                      <Button size="sm" onClick={() => setShowShareListModal(true)}>
                        Share Your First List
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {sharedLists.map((list) => (
                        <Link key={list.id} href={`/lists/${list.id}`}>
                          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium text-lg">{list.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {list.restaurantCount} restaurants • Shared by {list.createdBy?.name}
                                </p>
                                {list.description && (
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                    {list.description}
                                  </p>
                                )}
                              </div>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Members Preview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Members</h2>
                    <Link href={`/circles/${circleId}/members`}>
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>
                  <Card className="p-4">
                    <div className="flex -space-x-2">
                      {circle.members?.slice(0, 8).map((member) => (
                        <div
                          key={member.id}
                          className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-sm font-medium"
                          title={member.name}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(circle.memberCount || 0) > 8 && (
                        <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-sm font-medium text-gray-600">
                          +{circle.memberCount - 8}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <p>Circle not found</p>
            </div>
          )}
        </div>

        {/* Mobile Navigation */}
        {isMobile && <MobileNavigation />}
      </div>

      {/* Share List Modal */}
      {showShareListModal && circle && (
        <ShareListModal
          circleId={circleId}
          circleName={circle.name}
          onClose={() => setShowShareListModal(false)}
        />
      )}
    </div>
  );
}