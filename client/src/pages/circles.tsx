import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Plus, Settings, MapPin, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { PendingInvites } from "@/components/circles/PendingInvites";
import { InviteModal } from "@/components/circles/InviteModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";

interface Circle {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
  primaryCuisine?: string;
  location?: string;
  priceRange?: string;
  role?: string;
  inviteCode?: string;
  allowPublicJoin?: boolean;
}

export default function CirclesPage() {
  const isMobile = useIsMobile();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);

  const { data: circles = [], isLoading } = useQuery<Circle[]>({
    queryKey: ['/api/circles'],
  });

  const handleInvite = (circle: Circle) => {
    setSelectedCircle(circle);
    setInviteModalOpen(true);
  };

  const CircleCard = ({ circle }: { circle: Circle }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{circle.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {circle.memberCount || 0} members
                </Badge>
                {circle.role && (
                  <Badge variant="secondary" className="text-xs">
                    {circle.role}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {(circle.role === 'owner' || circle.role === 'admin') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleInvite(circle)}
              className="gap-1"
            >
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {circle.description && (
          <p className="text-sm text-gray-600 mb-3">{circle.description}</p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {circle.primaryCuisine && (
            <span className="flex items-center gap-1">
              🍽️ {circle.primaryCuisine}
            </span>
          )}
          {circle.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {circle.location}
            </span>
          )}
          {circle.priceRange && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {circle.priceRange}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const LoadingCard = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? <MobileNavigation /> : <DesktopSidebar />}
      
      <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Circles</h1>
              <p className="text-gray-600">Connect with food lovers who share your taste</p>
            </div>
            <Link href="/create-circle">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Circle
              </Button>
            </Link>
          </div>

          <Tabs defaultValue="my-circles" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-circles">My Circles</TabsTrigger>
              <TabsTrigger value="invites">Pending Invites</TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-circles" className="mt-6">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array(4).fill(0).map((_, i) => (
                    <LoadingCard key={i} />
                  ))}
                </div>
              ) : circles.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No circles yet</h3>
                    <p className="text-gray-500 text-center mb-4">
                      Create your first circle to start connecting with other food enthusiasts
                    </p>
                    <Link href="/create-circle">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Circle
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {circles.map((circle) => (
                    <Link key={circle.id} href={`/circles/${circle.id}`}>
                      <CircleCard circle={circle} />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="invites" className="mt-6">
              <PendingInvites />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Invite Modal */}
      {selectedCircle && (
        <InviteModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          circleId={selectedCircle.id}
          circleName={selectedCircle.name}
        />
      )}
    </div>
  );
}