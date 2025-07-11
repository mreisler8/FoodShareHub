import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Search, UserPlus, Check } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface User {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
  bio?: string;
  isFollowing?: boolean;
  isMember?: boolean;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser?: (user: User) => void;
  onAddUser?: (user: User) => Promise<void>;
  selectedUsers?: User[];
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  showFollowStatus?: boolean;
  showMemberStatus?: boolean;
  excludeUserIds?: number[];
}

export function UserSearchModal({
  isOpen,
  onClose,
  onSelectUser,
  onAddUser,
  selectedUsers = [],
  title = "Search Users",
  subtitle = "Find people to connect with",
  actionLabel = "Add",
  showFollowStatus = false,
  showMemberStatus = false,
  excludeUserIds = [],
}: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [addingUserId, setAddingUserId] = useState<number | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search users
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/search/users", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      
      const response = await apiRequest(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`);
      // Extract users from unified search results
      return response.users || [];
    },
    enabled: isOpen && debouncedQuery.length > 0,
  });

  // Filter out already selected users and excluded IDs
  const filteredResults = searchResults.filter((user: User) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    const isExcluded = excludeUserIds.includes(user.id);
    return !isSelected && !isExcluded;
  });

  const handleAddUser = async (user: User) => {
    if (onAddUser) {
      setAddingUserId(user.id);
      try {
        await onAddUser(user);
      } finally {
        setAddingUserId(null);
      }
    } else if (onSelectUser) {
      onSelectUser(user);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">{subtitle}</p>
          
          {/* Search Input */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              Searching...
            </div>
          )}

          {!isLoading && searchQuery && filteredResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching "{searchQuery}"
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-8 text-gray-500">
              Start typing to search for users
            </div>
          )}

          <div className="space-y-2">
            {filteredResults.map((user: User) => (
              <Card
                key={user.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleAddUser(user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-gray-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                      {user.bio && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {showFollowStatus && user.isFollowing && (
                      <span className="text-xs text-gray-500">Following</span>
                    )}
                    {showMemberStatus && user.isMember && (
                      <span className="text-xs text-gray-500">Member</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={addingUserId === user.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddUser(user);
                      }}
                    >
                      {addingUserId === user.id ? (
                        "Adding..."
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3 mr-1" />
                          {actionLabel}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Selected Users Preview */}
        {selectedUsers.length > 0 && (
          <div className="border-t p-4">
            <p className="text-sm text-gray-600 mb-2">
              Selected ({selectedUsers.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  <Check className="h-3 w-3" />
                  {user.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}