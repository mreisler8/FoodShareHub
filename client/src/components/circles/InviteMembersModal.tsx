import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Link as LinkIcon, QrCode, Copy, Check, Mail, Search, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
}

interface Circle {
  id: number;
  name: string;
  inviteCode: string;
  isPrivate: boolean;
}

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  circle: Circle;
}

export function InviteMembersModal({ isOpen, onClose, circle }: InviteMembersModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const inviteLink = `${window.location.origin}/join/${circle.inviteCode}`;

  // Search users
  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/search/users", searchQuery],
    enabled: searchQuery.length > 2,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/search/users?q=${encodeURIComponent(searchQuery)}`);
      return response.users || [];
    },
  });

  // Send username invites
  const sendInvites = useMutation({
    mutationFn: async (userIds: number[]) => {
      return await apiRequest("POST", `/api/circles/${circle.id}/invites`, {
        userIds,
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitations sent!",
        description: `Successfully invited ${selectedUsers.length} users to ${circle.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      setSelectedUsers([]);
      setSearchQuery("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitations",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Send email invites
  const sendEmailInvites = useMutation({
    mutationFn: async (emails: string[]) => {
      return await apiRequest("POST", `/api/circles/${circle.id}/invites/email`, {
        emails,
      });
    },
    onSuccess: () => {
      toast({
        title: "Email invites sent!",
        description: `Successfully sent email invitations to ${circle.name}`,
      });
      setEmailInput("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email invitations",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast({
        title: "Link copied!",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy link",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleUserSelect = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
  };

  const handleUserRemove = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSendInvites = () => {
    if (selectedUsers.length === 0) return;
    sendInvites.mutate(selectedUsers.map(u => u.id));
  };

  const handleSendEmailInvites = () => {
    if (!emailInput.trim()) return;
    const emails = emailInput.split(",").map(e => e.trim()).filter(e => e);
    sendEmailInvites.mutate(emails);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Members to {circle.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search Users</TabsTrigger>
            <TabsTrigger value="email">Email Invites</TabsTrigger>
            <TabsTrigger value="link">Share Link</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <Card key={user.id} className="p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleUserSelect(user)}
                          disabled={selectedUsers.some(u => u.id === user.id)}
                        >
                          {selectedUsers.some(u => u.id === user.id) ? "Added" : "Add"}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Users ({selectedUsers.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                      {user.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleUserRemove(user.id)}
                      />
                    </Badge>
                  ))}
                </div>
                <Button
                  onClick={handleSendInvites}
                  disabled={sendInvites.isPending}
                  className="w-full"
                >
                  {sendInvites.isPending ? "Sending..." : `Send ${selectedUsers.length} Invitations`}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Enter email addresses separated by commas
              </p>
              <Input
                placeholder="email1@example.com, email2@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full"
              />
              <Button
                onClick={handleSendEmailInvites}
                disabled={sendEmailInvites.isPending || !emailInput.trim()}
                className="w-full"
              >
                {sendEmailInvites.isPending ? "Sending..." : "Send Email Invitations"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Share this link with anyone you want to invite
              </p>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {circle.isPrivate 
                  ? "This link will send a join request that you can approve"
                  : "Anyone with this link can join your circle"
                }
              </p>
            </div>

            <div className="text-center">
              <Button variant="outline" className="gap-2">
                <QrCode className="h-4 w-4" />
                Generate QR Code
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}