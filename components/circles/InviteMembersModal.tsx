
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { 
  Search, 
  UserPlus, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  Mail,
  Clock,
  Shield,
  Info
} from "lucide-react";
import { User, Circle } from "@shared/schema";

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  circleId: string;
  circleName: string;
  isPrivate?: boolean;
}

interface SearchResult extends User {
  alreadyMember?: boolean;
  pendingInvite?: boolean;
  canInvite?: boolean;
}

interface InviteData {
  circleId: string;
  emailOrUsername: string;
  inviterId: string;
}

export function InviteMembersModal({ 
  isOpen, 
  onClose, 
  circleId, 
  circleName,
  isPrivate = false 
}: InviteMembersModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<SearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch current user for permission checks
  const { data: currentUser } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    }
  });

  // Fetch circle details for permission validation
  const { data: circle } = useQuery({
    queryKey: [`/api/circles/${circleId}`],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}`);
      if (!response.ok) throw new Error('Failed to fetch circle data');
      return response.json();
    },
    enabled: !!circleId
  });

  // Search users with debouncing and enterprise validation
  const { data: userSearchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['/api/users/search', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      
      const users = await response.json();
      
      // Check membership status for each user
      const usersWithStatus = await Promise.all(
        users.map(async (user: User) => {
          try {
            const memberCheck = await fetch(`/api/circles/${circleId}/members/${user.id}`);
            const inviteCheck = await fetch(`/api/circles/${circleId}/invites/check/${user.id}`);
            
            return {
              ...user,
              alreadyMember: memberCheck.ok,
              pendingInvite: inviteCheck.ok,
              canInvite: !memberCheck.ok && !inviteCheck.ok
            };
          } catch {
            return { ...user, canInvite: true };
          }
        })
      );
      
      return usersWithStatus;
    },
    enabled: searchTerm.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Send invitations mutation with enterprise error handling
  const sendInvitesMutation = useMutation({
    mutationFn: async (inviteData: InviteData[]) => {
      const response = await fetch(`/api/circles/${circleId}/invites/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invites: inviteData,
          circleId: parseInt(circleId),
          inviterId: currentUser?.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitations');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const { successful, failed } = data;
      
      toast({
        title: "Invitations Sent",
        description: `${successful.length} invitation(s) sent successfully${
          failed.length > 0 ? `, ${failed.length} failed` : ''
        }`,
        variant: successful.length > 0 ? "default" : "destructive"
      });

      // Analytics tracking
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Circle Members Invited', {
          circleId: circleId,
          circleName: circleName,
          inviteCount: successful.length,
          failedCount: failed.length,
          isPrivateCircle: isPrivate
        });
      }

      // Reset state and close modal
      setSelectedUsers([]);
      setSearchTerm("");
      setValidationErrors([]);
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/invites`] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update search results when query data changes
  useEffect(() => {
    setSearchResults(userSearchResults);
  }, [userSearchResults]);

  // Validation logic for enterprise compliance
  const validateInvitations = (): boolean => {
    const errors: string[] = [];

    if (selectedUsers.length === 0) {
      errors.push("Please select at least one user to invite");
    }

    if (selectedUsers.length > 50) {
      errors.push("Cannot invite more than 50 users at once");
    }

    const invalidUsers = selectedUsers.filter(user => !user.canInvite);
    if (invalidUsers.length > 0) {
      errors.push(`${invalidUsers.length} selected user(s) cannot be invited`);
    }

    // Check if user has permission to invite
    if (circle && currentUser) {
      const isOwner = circle.creatorId === currentUser.id;
      const isAdmin = false; // Would need to check admin status
      
      if (!isOwner && !isAdmin && isPrivate) {
        errors.push("Only circle owners and admins can invite members to private circles");
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleAddUser = (user: SearchResult) => {
    if (!user.canInvite) return;
    
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(prev => [...prev, user]);
      setSearchTerm("");
      setSearchResults([]);
    }
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  const handleSendInvites = () => {
    if (!validateInvitations() || !currentUser) return;

    const inviteData: InviteData[] = selectedUsers.map(user => ({
      circleId: circleId,
      emailOrUsername: user.username,
      inviterId: currentUser.id.toString()
    }));

    sendInvitesMutation.mutate(inviteData);
  };

  const getUserStatusBadge = (user: SearchResult) => {
    if (user.alreadyMember) {
      return <Badge variant="secondary" className="ml-2"><Users className="h-3 w-3 mr-1" />Member</Badge>;
    }
    if (user.pendingInvite) {
      return <Badge variant="outline" className="ml-2"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Members to {circleName}
            {isPrivate && <Shield className="h-4 w-4 text-amber-500" />}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Privacy Notice for Enterprise Compliance */}
          {isPrivate && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This is a private circle. Only invited members can see content and activity.
              </AlertDescription>
            </Alert>
          )}

          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search-users">Search users by username or name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search-users"
                type="text"
                placeholder="Type to search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchTerm.length >= 2 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 flex items-center justify-between hover:bg-gray-50 ${
                        !user.canInvite ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      onClick={() => user.canInvite && handleAddUser(user)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                        {getUserStatusBadge(user)}
                      </div>
                      {user.canInvite && (
                        <Button size="sm" variant="outline">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">No users found</div>
              )}
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <Label>Selected Users ({selectedUsers.length})</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-gray-500">@{user.username}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveUser(user.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInvites}
            disabled={selectedUsers.length === 0 || sendInvitesMutation.isPending}
            className="min-w-[120px]"
          >
            {sendInvitesMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invites ({selectedUsers.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
