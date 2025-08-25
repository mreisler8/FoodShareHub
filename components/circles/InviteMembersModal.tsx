import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X, UserPlus, Check, AlertCircle } from "lucide-react";
import { z } from "zod";

// Enterprise-grade type definitions
interface User {
  id: number;
  username: string;
  name: string;
  profilePicture?: string;
}

interface InviteMembersModalProps {
  circleId: string;
  circleName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InviteRequest {
  emailOrUsername: string;
  inviterId: number;
  circleId: string;
}

// Validation schema
const inviteSchema = z.object({
  emailOrUsername: z.string()
    .min(1, "Username or email is required")
    .refine(
      (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return emailRegex.test(value) || usernameRegex.test(value);
      },
      "Must be a valid email or username (3-20 characters, letters, numbers, underscore only)"
    ),
});

export function InviteMembersModal({ 
  circleId, 
  circleName, 
  open, 
  onOpenChange 
}: InviteMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Search users with debouncing
  const { data: searchResults = [], isLoading: isSearching } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      if (!response.ok) {
        throw new Error("Failed to search users");
      }
      return response.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get current circle members to exclude from search
  const { data: circleMembers = [] } = useQuery<User[]>({
    queryKey: [`/api/circles/${circleId}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/members`);
      if (!response.ok) throw new Error("Failed to fetch circle members");
      return response.json();
    },
  });

  // Filter out existing members and already selected users
  const filteredResults = searchResults.filter(user => 
    !circleMembers.some(member => member.id === user.id) &&
    !selectedUsers.some(selected => selected.id === user.id)
  );

  const inviteMutation = useMutation({
    mutationFn: async (invites: InviteRequest[]) => {
      const response = await fetch(`/api/circles/${circleId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invites }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send invitations");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const { successful, failed } = data;

      if (successful > 0) {
        toast({
          title: "Invitations sent",
          description: `Successfully sent ${successful} invitation${successful !== 1 ? 's' : ''} to ${circleName}`,
        });
      }

      if (failed.length > 0) {
        toast({
          title: "Some invitations failed",
          description: `${failed.length} invitation${failed.length !== 1 ? 's' : ''} could not be sent`,
          variant: "destructive",
        });
      }

      // Reset form
      setSelectedUsers([]);
      setInputValue("");
      setSearchQuery("");
      setValidationErrors([]);

      // Optimized query invalidation - only invalidate what changed
      queryClient.invalidateQueries({ 
        queryKey: [`/api/circles/${circleId}/members`],
        exact: true 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/circles/${circleId}/invites`],
        exact: true 
      });

      if (successful > 0) {
        onOpenChange(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUserSelect = (user: User) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery("");
    setInputValue("");
    setIsSearchOpen(false);

    // Focus back to input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleUserRemove = (userId: number) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  const handleDirectInvite = () => {
    if (!inputValue.trim()) return;

    // Validate input
    const validation = inviteSchema.safeParse({ emailOrUsername: inputValue.trim() });
    if (!validation.success) {
      setValidationErrors(validation.error.errors.map(err => err.message));
      return;
    }

    setValidationErrors([]);

    // Check if already selected
    const isAlreadySelected = selectedUsers.some(user => 
      user.username.toLowerCase() === inputValue.toLowerCase()
    );

    if (isAlreadySelected) {
      toast({
        title: "User already selected",
        description: "This user is already in your invitation list",
        variant: "destructive",
      });
      return;
    }

    // Add as direct invite (for email addresses or usernames not found in search)
    const directUser: User = {
      id: Date.now(), // Temporary ID for direct invites
      username: inputValue.trim(),
      name: inputValue.trim(),
    };

    setSelectedUsers(prev => [...prev, directUser]);
    setInputValue("");
    setSearchQuery("");
  };

  const handleSendInvitations = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user to invite",
        variant: "destructive",
      });
      return;
    }

    const invites: InviteRequest[] = selectedUsers.map(user => ({
      emailOrUsername: user.username,
      inviterId: 0, // Will be set on backend from session
      circleId,
    }));

    inviteMutation.mutate(invites);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (filteredResults.length > 0) {
        handleUserSelect(filteredResults[0]);
      } else {
        handleDirectInvite();
      }
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedUsers([]);
      setInputValue("");
      setSearchQuery("");
      setValidationErrors([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Members to {circleName}
          </DialogTitle>
          <DialogDescription>
            Search for users by username or invite by email address. You can select multiple users to invite at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    placeholder="Search username or enter email..."
                    value={inputValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setInputValue(value);
                      setSearchQuery(value);
                      setIsSearchOpen(value.length >= 2);
                      setValidationErrors([]);
                    }}
                    onKeyDown={handleKeyDown}
                    className={validationErrors.length > 0 ? "border-destructive" : ""}
                    aria-describedby={validationErrors.length > 0 ? "validation-errors" : undefined}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <LoadingSpinner className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandList>
                    {filteredResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                      <CommandEmpty>
                        No users found. Press Enter to invite "{inputValue}" directly.
                      </CommandEmpty>
                    )}
                    {filteredResults.length > 0 && (
                      <CommandGroup>
                        {filteredResults.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => handleUserSelect(user)}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            {user.profilePicture ? (
                              <img
                                src={user.profilePicture}
                                alt={user.name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div id="validation-errors" className="text-sm text-destructive space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Selected Users ({selectedUsers.length})</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="flex items-center gap-2 pr-1"
                  >
                    <span>{user.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleUserRemove(user.id)}
                      aria-label={`Remove ${user.name} from invitation list`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInvitations}
            disabled={selectedUsers.length === 0 || inviteMutation.isPending}
            className="min-w-[120px]"
          >
            {inviteMutation.isPending ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Sending...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Send Invites ({selectedUsers.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}