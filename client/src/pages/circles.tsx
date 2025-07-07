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
import { Users, Plus, Link as LinkIcon, MapPin, Copy, ExternalLink } from "lucide-react";
import { JoinCircleModal } from "@/components/circles/JoinCircleModal";

export default function CirclesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [allowPublicJoin, setAllowPublicJoin] = useState(true);
  
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
    mutationFn: async (data: { name: string; description?: string; allowPublicJoin?: boolean }) => {
      const res = await apiRequest("POST", "/api/circles", data);
      return res.json();
    },
    onSuccess: (newCircle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      setAllowPublicJoin(true);
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

  // Copy invite link to clipboard
  const copyInviteLink = (inviteCode: string) => {
    const inviteLink = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Invite link copied!",
      description: "Share this link with friends to invite them to your circle.",
    });
  };

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
      allowPublicJoin,
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
          <Button
            variant="outline"
            onClick={() => setIsJoinOpen(true)}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            Join Circle
          </Button>

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
                <div className="flex items-center space-x-2">
                  <input
                    id="allow-public-join"
                    type="checkbox"
                    checked={allowPublicJoin}
                    onChange={(e) => setAllowPublicJoin(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="allow-public-join">Allow anyone to join with invite link</Label>
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
          
          {/* Join Circle Modal */}
          <JoinCircleModal
            open={isJoinOpen}
            onOpenChange={setIsJoinOpen}
          />
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
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">
                        {circle.isPrivate ? "Private" : "Public"}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <MapPin className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </div>
                    
                    {circle.inviteCode && circle.allowPublicJoin && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Invite Code</p>
                            <p className="font-mono text-sm font-semibold">{circle.inviteCode}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(circle.inviteCode)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
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