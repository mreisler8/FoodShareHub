import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Plus, Settings, MapPin, DollarSign, Globe, Lock, Crown, Shield } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ContentCard from "@/components/ui/ContentCard";
import { apiRequest } from "@/lib/queryClient";
import { PendingInvites } from "@/components/circles/PendingInvites";
import { InviteModal } from "@/components/circles/InviteModal";
import { SimpleCircleWizard } from "@/components/circles/SimpleCircleWizard";
import { CreateCircleForm } from "@/components/circles/CreateCircleForm";
import { InviteMembersModal } from "@/components/circles/InviteMembersModal";
import { CircleFeed } from "@/components/circles/CircleFeed";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";
import { AppHeader } from "@/components/ui/AppHeader";

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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [activeTab, setActiveTab] = useState("my-circles");

  const { data: circles = [], isLoading } = useQuery<Circle[]>({
    queryKey: ['/api/circles'],
  });

  const { data: publicCircles = [] } = useQuery<Circle[]>({
    queryKey: ['/api/circles/public'],
    enabled: activeTab === "discover",
  });

  const handleInvite = (circle: Circle) => {
    setSelectedCircle(circle);
    setInviteModalOpen(true);
  };

  const handleCreateSuccess = (circle: any) => {
    setCreateFormOpen(false);
    setActiveTab("my-circles");
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const CircleCard = ({ circle, showJoinButton = false }: { circle: Circle; showJoinButton?: boolean }) => (
    <ContentCard hover={true} className="cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{circle.name}</h3>
              {circle.allowPublicJoin ? (
                <Globe className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-orange-600" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {circle.memberCount || 0} members
              </Badge>
              {circle.role && (
                <Badge variant="secondary" className={`text-xs ${getRoleColor(circle.role)}`}>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(circle.role)}
                    {circle.role}
                  </div>
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showJoinButton ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <UserPlus className="h-4 w-4" />
              Join
            </Button>
          ) : (
            (circle.role === 'owner' || circle.role === 'admin') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleInvite(circle)}
                className="gap-1"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            )
          )}
        </div>
      </div>
      
      {circle.description && (
        <p className="text-sm text-gray-600">{circle.description}</p>
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
    </ContentCard>
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
        {/* App Header with logo */}
        <AppHeader 
          title="Circles" 
          showBackButton={false}
        />
        
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Circles</h1>
              <p className="text-gray-600">Connect with food lovers who share your taste</p>
            </div>
            <Button className="gap-2" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Circle
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-circles">My Circles</TabsTrigger>
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="invites">Invites</TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-circles" className="mt-6">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array(4).fill(0).map((_, i) => (
                    <LoadingCard key={i} />
                  ))}
                </div>
              ) : circles.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No circles yet"
                  description="Create your first circle to start connecting with other food enthusiasts"
                  action={{
                    label: "Create Your First Circle",
                    onClick: () => setCreateFormOpen(true)
                  }}
                />
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
            
            <TabsContent value="discover" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Discover Public Circles</h2>
                  <Badge variant="outline">
                    {publicCircles.length} available
                  </Badge>
                </div>
                {publicCircles.length === 0 ? (
                  <EmptyState
                    icon={Globe}
                    title="No public circles found"
                    description="Be the first to create a public circle for others to discover"
                    action={{
                      label: "Create Public Circle",
                      onClick: () => setCreateFormOpen(true)
                    }}
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {publicCircles.map((circle) => (
                      <CircleCard key={circle.id} circle={circle} showJoinButton={true} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="invites" className="mt-6">
              <PendingInvites />
            </TabsContent>
          </Tabs>

          {/* Modals */}
          <SimpleCircleWizard
            isOpen={wizardOpen}
            onClose={() => setWizardOpen(false)}
          />
          
          <Dialog open={createFormOpen} onOpenChange={setCreateFormOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <CreateCircleForm 
                onSuccess={handleCreateSuccess}
                onCancel={() => setCreateFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
          
          {inviteModalOpen && selectedCircle && (
            <InviteMembersModal
              isOpen={inviteModalOpen}
              onClose={() => setInviteModalOpen(false)}
              circle={selectedCircle}
            />
          )}
        </div>
      </div>
    </div>
  );
}