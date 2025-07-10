import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserSearchModal } from '@/components/search/UserSearchModal';
import { CircleManagement } from '@/components/circles/CircleManagement';
import { Users, Search, Plus, UserPlus, Settings } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Circle {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  role: 'owner' | 'admin' | 'member';
}

export default function UserDiscovery() {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user's circles
  const { data: circles = [], isLoading: circlesLoading } = useQuery({
    queryKey: ['/api/me/circles'],
    queryFn: () => apiRequest('/api/me/circles'),
  });

  // Get circles where user can manage members
  const managedCircles = circles.filter((circle: Circle) => 
    circle.role === 'owner' || circle.role === 'admin'
  );

  const handleManageCircle = (circle: Circle) => {
    setSelectedCircle(circle);
  };

  const handleBackToDiscovery = () => {
    setSelectedCircle(null);
  };

  if (selectedCircle) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBackToDiscovery}
              className="mb-4"
            >
              ← Back to Discovery
            </Button>
          </div>
          <CircleManagement
            circleId={selectedCircle.id}
            onClose={handleBackToDiscovery}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Discovery</h1>
          <p className="text-muted-foreground">
            Find and connect with other food enthusiasts, add them to your circles, and build your network.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowUserSearch(true)}>
            <CardContent className="p-6 text-center">
              <Search className="w-8 h-8 mx-auto mb-3 text-blue-600" />
              <h3 className="font-semibold mb-2">Search Users</h3>
              <p className="text-sm text-muted-foreground">Find users by name, interests, or location</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowUserSearch(true)}>
            <CardContent className="p-6 text-center">
              <UserPlus className="w-8 h-8 mx-auto mb-3 text-green-600" />
              <h3 className="font-semibold mb-2">Add to Circles</h3>
              <p className="text-sm text-muted-foreground">Invite discovered users to your circles</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-3 text-purple-600" />
              <h3 className="font-semibold mb-2">Network Growth</h3>
              <p className="text-sm text-muted-foreground">Grow your food community connections</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="circles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="circles">My Circles</TabsTrigger>
            <TabsTrigger value="discovery">Discovery</TabsTrigger>
          </TabsList>

          <TabsContent value="circles" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Circles</h2>
              <Button
                variant="outline"
                onClick={() => setShowUserSearch(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Members
              </Button>
            </div>

            {circlesLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading circles...</span>
              </div>
            ) : circles.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Circles Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first circle to start building your food community.
                  </p>
                  <Button>Create Circle</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {circles.map((circle: Circle) => (
                  <Card key={circle.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{circle.name}</CardTitle>
                        <Badge variant={circle.isPrivate ? 'secondary' : 'default'}>
                          {circle.isPrivate ? 'Private' : 'Public'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {circle.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{circle.memberCount} members</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {circle.role}
                          </Badge>
                          {(circle.role === 'owner' || circle.role === 'admin') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageCircle(circle)}
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              Manage
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

          <TabsContent value="discovery" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Discover Users</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowUserSearch(true)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Advanced Search
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Popular Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Discover food enthusiasts with the most active communities.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowUserSearch(true)}
                  >
                    Browse Popular Users
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Find by Interest
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Search for users based on cuisine preferences and dining interests.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowUserSearch(true)}
                  >
                    Search by Interest
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>How to Use User Discovery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-semibold">1</span>
                    </div>
                    <h4 className="font-semibold mb-1">Search Users</h4>
                    <p className="text-xs text-muted-foreground">
                      Find users by name, interests, or location
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-600 font-semibold">2</span>
                    </div>
                    <h4 className="font-semibold mb-1">Connect</h4>
                    <p className="text-xs text-muted-foreground">
                      Follow users and view their recommendations
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-600 font-semibold">3</span>
                    </div>
                    <h4 className="font-semibold mb-1">Add to Circles</h4>
                    <p className="text-xs text-muted-foreground">
                      Invite them to your food circles
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Search Modal */}
        <UserSearchModal
          isOpen={showUserSearch}
          onClose={() => setShowUserSearch(false)}
          showAddToCircle={managedCircles.length > 0}
          availableCircles={managedCircles}
        />
      </div>
    </div>
  );
}