import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
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
      const response = await apiRequest("POST", `/api/circles/${circle.id}/invite`, {
        userIds,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Invites Sent!",
        description: `Sent ${selectedUsers.length} invite${selectedUsers.length !== 1 ? 's' : ''}`,
      });
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circle.id}/members`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invites. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send email invites
  const sendEmailInvites = useMutation({
    mutationFn: async (emails: string[]) => {
      const response = await apiRequest("POST", `/api/circles/${circle.id}/invite-email`, {
        emails,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Email Invites Sent!",
        description: "Invitation emails have been sent.",
      });
      setEmailInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email invites. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast({
        title: "Link Copied!",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleSelectUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSendInvites = () => {
    if (selectedUsers.length > 0) {
      sendInvites.mutate(selectedUsers.map(u => u.id));
    }
  };

  const handleSendEmailInvites = () => {
    const emails = emailInput
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    if (emails.length > 0) {
      sendEmailInvites.mutate(emails);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Members to {circle.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Find Users</TabsTrigger>
            <TabsTrigger value="email">Email Invites</TabsTrigger>
            <TabsTrigger value="link">Share Link</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Selected ({selectedUsers.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <Badge key={user.id} variant="secondary" className="gap-1">
                        {user.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveUser(user.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    onClick={handleSendInvites}
                    disabled={sendInvites.isPending}
                    size="sm"
                  >
                    {sendInvites.isPending ? "Sending..." : `Send ${selectedUsers.length} Invite${selectedUsers.length !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              )}

              {/* Search Results */}
              {searchQuery.length > 2 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Search Results</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map(user => (
                        <Card key={user.id} className="p-3 hover:bg-accent cursor-pointer transition-colors">
                          <CardContent className="p-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.name}</p>
                                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectUser(user)}
                                disabled={selectedUsers.find(u => u.id === user.id) !== undefined}
                              >
                                {selectedUsers.find(u => u.id === user.id) ? "Selected" : "Select"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No users found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Addresses</label>
                <textarea
                  placeholder="Enter email addresses (one per line or comma-separated)&#10;example@gmail.com&#10;friend@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full min-h-32 p-3 border rounded-md resize-none"
                />
              </div>
              <Button 
                onClick={handleSendEmailInvites}
                disabled={sendEmailInvites.isPending || !emailInput.trim()}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                {sendEmailInvites.isPending ? "Sending..." : "Send Email Invites"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Invite Link</label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="gap-2"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
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
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}