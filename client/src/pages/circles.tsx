import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { Circle } from "@shared/schema";

import { Button } from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Link as LinkIcon, MapPin } from "lucide-react";

export default function CirclesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  
  const currentUser = useCurrentUser();
  const { toast } = useToast();

  // Fetch user's circles
  const { data: userCircles, isLoading } = useQuery({
    queryKey: ["/api/circles/user"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/circles/user");
      return res.json();
    },
    enabled: !!currentUser,
  });

  // Fetch featured/public circles
  const { data: featuredCircles } = useQuery({
    queryKey: ["/api/circles/featured"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/circles/featured");
      return res.json();
    },
  });

  // Create circle mutation
  const createCircleMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/circles", data);
      return res.json();
    },
    onSuccess: (newCircle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      toast({
        title: "Circle created!",
        description: `${newCircle.name} is ready for your recommendations.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create circle",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Join circle mutation
  const joinCircleMutation = useMutation({
    mutationFn: async (circleId: number) => {
      const res = await apiRequest("POST", `/api/circles/${circleId}/join`);
      return res.json();
    },
    onSuccess: (circle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      setIsJoinOpen(false);
      setJoinCode("");
      toast({
        title: "Joined circle!",
        description: `Welcome to ${circle.name}!`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to join circle",
        description: "Please check the invite code and try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCircle = () => {
    if (!createName.trim()) {
      toast({
        title: "Circle name required",
        description: "Please enter a name for your circle.",
        variant: "destructive",
      });
      return;
    }
    createCircleMutation.mutate({
      name: createName.trim(),
      description: createDescription.trim() || undefined,
    });
  };

  const handleJoinCircle = () => {
    if (!joinCode.trim()) {
      toast({
        title: "Invite code required",
        description: "Please enter an invite code.",
        variant: "destructive",
      });
      return;
    }
    
    // Extract circle ID from invite code or URL
    const circleId = parseInt(joinCode.replace(/.*\//, ''));
    if (isNaN(circleId)) {
      toast({
        title: "Invalid invite code",
        description: "Please check the invite code format.",
        variant: "destructive",
      });
      return;
    }
    
    joinCircleMutation.mutate(circleId);
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Join Food Circles</h1>
          <p className="text-muted-foreground mb-6">
            Please log in to create and join food circles with your friends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Food Circles</h1>
          <p className="text-muted-foreground">Create trusted circles of friends and discover each other's favorite spots.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LinkIcon className="mr-2 h-4 w-4" />
                Join Circle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Circle</DialogTitle>
                <DialogDescription>
                  Enter an invite code or link to join an existing circle.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="join-code">Invite Code or Link</Label>
                  <Input
                    id="join-code"
                    placeholder="Paste invite code or link here..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsJoinOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleJoinCircle} disabled={joinCircleMutation.isPending}>
                  {joinCircleMutation.isPending ? "Joining..." : "Join Circle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Circle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Circle</DialogTitle>
                <DialogDescription>
                  Start a new food circle to share recommendations with friends.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="circle-name">Circle Name</Label>
                  <Input
                    id="circle-name"
                    placeholder="e.g., Weekend Foodies, Office Lunch Club"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="circle-description">Description (Optional)</Label>
                  <Textarea
                    id="circle-description"
                    placeholder="Tell members what this circle is about..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCircle} disabled={createCircleMutation.isPending}>
                  {createCircleMutation.isPending ? "Creating..." : "Create Circle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* My Circles */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">My Circles</h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : userCircles && userCircles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userCircles.map((circle: Circle & { memberCount?: number }) => (
              <Card key={circle.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{circle.name}</span>
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {circle.memberCount || 1}
                    </Badge>
                  </CardTitle>
                  {circle.description && (
                    <CardDescription>{circle.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">
                      {circle.isPrivate ? "Private" : "Public"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <MapPin className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No circles yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first circle to start sharing restaurant recommendations with friends.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first Circle
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Featured Circles */}
      {featuredCircles && featuredCircles.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Discover Circles</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredCircles.map((circle: Circle & { memberCount?: number }) => (
              <Card key={circle.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{circle.name}</span>
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {circle.memberCount || 0}
                    </Badge>
                  </CardTitle>
                  {circle.description && (
                    <CardDescription>{circle.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">Featured</Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => joinCircleMutation.mutate(circle.id)}
                      disabled={joinCircleMutation.isPending}
                    >
                      {joinCircleMutation.isPending ? "Joining..." : "Join"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}