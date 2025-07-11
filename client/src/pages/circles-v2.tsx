import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";
import { 
  Users, 
  Plus, 
  Search, 
  Globe, 
  Lock, 
  Copy, 
  ArrowRight,
  ChevronRight,
  UserPlus,
  Share2,
  Activity
} from "lucide-react";

interface Circle {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
  isPrivate: boolean;
  inviteCode?: string;
  allowPublicJoin?: boolean;
  createdAt: string;
  role?: string;
  recentActivity?: string;
  sharedListsCount?: number;
}

export default function CirclesV2Page() {
  const isMobile = useIsMobile();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [circleName, setCircleName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");

  const { data: circles = [], isLoading } = useQuery<Circle[]>({
    queryKey: ['/api/circles'],
  });

  const handleCreateCircle = async () => {
    if (!circleName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a circle name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiRequest("/api/circles", {
        method: "POST",
        body: JSON.stringify({
          name: circleName,
          description: description || undefined,
          tags: tags || undefined,
          isPrivate: !isPublic,
          allowPublicJoin: isPublic,
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      
      // Send invites if emails were provided
      if (inviteEmails.trim() && response?.id) {
        const emails = inviteEmails.split('\n').filter(email => email.trim());
        // Note: Invite functionality would be implemented here
        // For now, just show success message
      }
      
      toast({
        title: "Circle created!",
        description: "Your new circle is ready",
      });
      
      // Reset form
      setCircleName("");
      setDescription("");
      setTags("");
      setInviteEmails("");
      setIsPublic(false);
      setShowCreateForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create circle",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinCircle = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an invite code",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest(`/api/circles/join/${joinCode}`, {
        method: "POST",
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      
      toast({
        title: "Success!",
        description: "You've joined the circle",
      });
      
      setJoinCode("");
      setShowJoinForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid invite code or circle not found",
        variant: "destructive",
      });
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {!isMobile && <DesktopSidebar />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Circles</h1>
              <p className="text-gray-600">
                Connect with friends and share your favorite food spots
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Create Circle Card */}
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary"
                    onClick={() => setShowCreateForm(!showCreateForm)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Create a Circle</h3>
                    <p className="text-sm text-gray-600">Start your own food community</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>

              {/* Join Circle Card */}
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary"
                    onClick={() => setShowJoinForm(!showJoinForm)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Join a Circle</h3>
                    <p className="text-sm text-gray-600">Enter an invite code</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <Card className="p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Create New Circle</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Circle Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Pizza Lovers NYC"
                      value={circleName}
                      onChange={(e) => setCircleName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="desc">Description (optional)</Label>
                    <Textarea
                      id="desc"
                      placeholder="What's this circle about?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (optional)</Label>
                    <Input
                      id="tags"
                      placeholder="e.g., italian, pizza, casual-dining (comma-separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add tags to help others discover your circle
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="invites">Invite Members (optional)</Label>
                    <Textarea
                      id="invites"
                      placeholder="Enter email addresses, one per line"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can also invite members later
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="public"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="public" className="font-normal cursor-pointer">
                      Allow anyone with the link to join
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateCircle}
                      disabled={isCreating || !circleName.trim()}
                    >
                      {isCreating ? "Creating..." : "Create Circle"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Link href="/create-circle-advanced">
                      <Button variant="ghost" className="ml-auto">
                        Advanced Options →
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            {/* Join Form */}
            {showJoinForm && (
              <Card className="p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Join a Circle</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="code">Invite Code</Label>
                    <Input
                      id="code"
                      placeholder="Enter 8-character code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="mt-1 font-mono"
                      maxLength={8}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleJoinCircle}
                      disabled={!joinCode.trim()}
                    >
                      Join Circle
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowJoinForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Circles Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </Card>
                ))}
              </div>
            ) : circles.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No circles yet</h3>
                <p className="text-gray-500 mb-4">
                  Create or join a circle to start sharing food recommendations
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {circles.map((circle) => (
                  <Link key={circle.id} href={`/circles/${circle.id}`}>
                    <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            circle.isPrivate ? 'bg-gray-100' : 'bg-blue-100'
                          }`}>
                            {circle.isPrivate ? (
                              <Lock className="h-5 w-5 text-gray-600" />
                            ) : (
                              <Globe className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold group-hover:text-primary transition-colors">
                              {circle.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {circle.memberCount || 0} members
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      
                      {circle.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {circle.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-gray-500">
                          <span className="flex items-center gap-1">
                            <Share2 className="h-4 w-4" />
                            {circle.sharedListsCount || 0} lists
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-4 w-4" />
                            Active
                          </span>
                        </div>
                        {circle.inviteCode && circle.role === 'owner' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              copyInviteCode(circle.inviteCode!);
                            }}
                            className="h-8 px-2"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobile && <MobileNavigation />}
      </div>
    </div>
  );
}