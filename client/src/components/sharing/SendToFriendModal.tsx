import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Send, X, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
}

interface SendToFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "restaurant" | "list";
  entityId: string | number;
  entityName: string;
}

export function SendToFriendModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName
}: SendToFriendModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Memoize search function to prevent re-renders
  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const startTime = Date.now();
      const response = await apiRequest(`/api/sharing/search-users?q=${encodeURIComponent(query)}`) as any;
      const responseTime = Date.now() - startTime;
      
      // NFR: Search must respond within 300ms
      if (responseTime > 300) {
        console.warn(`Search took ${responseTime}ms, exceeding 300ms target`);
      }
      
      setSearchResults(response.users || []);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Unable to search for users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  // NFR: Search with 300ms debounce for performance
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSendToFriend = async () => {
    if (!selectedUser) return;

    setIsSending(true);
    const startTime = Date.now();

    try {
      await apiRequest("/api/sharing/send-internal", {
        method: "POST",
        body: JSON.stringify({
          receiverId: selectedUser.id,
          entityType,
          entityId: entityId.toString(),
          message: message.trim() || null,
        }),
      });

      const responseTime = Date.now() - startTime;
      
      // NFR: Share operations must complete within 2 seconds
      if (responseTime > 2000) {
        console.warn(`Share operation took ${responseTime}ms, exceeding 2s target`);
      }

      toast({
        title: "Sent successfully!",
        description: `${entityName} has been shared with ${selectedUser.name}`,
      });

      // Reset and close modal
      setSelectedUser(null);
      setMessage("");
      setSearchQuery("");
      setSearchResults([]);
      onClose();

    } catch (error: any) {
      console.error("Send error:", error);
      
      let errorMessage = "Failed to send recommendation. Please try again.";
      if (error.message?.includes("403")) {
        errorMessage = "You can only share with users you follow or share circles with.";
      } else if (error.message?.includes("rate limit")) {
        errorMessage = "Too many shares. Please wait before sharing again.";
      }

      toast({
        title: "Send failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveSelectedUser = () => {
    setSelectedUser(null);
  };

  // NFR: Mobile optimization with touch interactions
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send to Friend
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Entity info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 capitalize">{entityType}</p>
            <p className="font-medium">{entityName}</p>
          </div>

          {/* Selected user display */}
          {selectedUser && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedUser.profilePicture} />
                  <AvatarFallback>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedUser.name}</p>
                  <p className="text-xs text-gray-600">@{selectedUser.username}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveSelectedUser}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* User search */}
          {!selectedUser && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search for friends to share with..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* Search results - NFR: Maximum 50 results for performance */}
              {searchResults.length > 0 && (
                <ScrollArea className="h-32 border rounded-md">
                  <div className="p-2 space-y-1">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profilePicture} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-gray-600">@{user.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No friends found</p>
                  <p className="text-xs">You can only share with people you follow or share circles with</p>
                </div>
              )}
            </div>
          )}

          {/* Message input - NFR: 140 character limit */}
          {selectedUser && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Add a message (optional)
              </label>
              <Textarea
                placeholder={`Hey! I thought you'd like this ${entityType}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 140))}
                className="resize-none"
                rows={3}
              />
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Make it personal!</span>
                <span>{message.length}/140</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendToFriend}
              disabled={!selectedUser || isSending}
              className="flex-1"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}