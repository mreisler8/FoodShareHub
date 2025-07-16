import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { SearchInput } from "@/components/search/SearchInput";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { SearchResult } from "@/services/searchService";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
  const [addingUserId, setAddingUserId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  const {
    searchQuery,
    setSearchQuery,
    results,
    isLoading,
    error,
    inputRef,
    recordSearch
  } = useSearch({
    searchType: 'users',
    enabled: isOpen,
    autoFocus: true,
    includeLocation: false,
    includeTrending: false,
    includeRecentSearches: false
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string, action: 'follow' | 'unfollow' }) => {
      if (action === 'follow') {
        await apiRequest(`/api/follow/${userId}`, {
          method: 'POST',
        });
      } else {
        await apiRequest(`/api/follow/${userId}`, {
          method: 'DELETE',
        });
      }
    },
    onSuccess: () => {
      // Invalidate search results to refresh follow status
      queryClient.invalidateQueries({ queryKey: ['/api/search'] });
    }
  });

  // Convert SearchResult to User and filter out already selected users and excluded IDs
  const filteredResults = (Array.isArray(results) ? results : [])
    .map((result: SearchResult) => ({
      id: parseInt(result.id),
      name: result.name,
      username: result.username || result.name,
      profilePicture: result.profilePicture || result.avatar,
      bio: result.bio || result.subtitle,
      isFollowing: result.isFollowing,
      isMember: false
    }))
    .filter((user: User) => {
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
    recordSearch(user.name);
  };

  const handleResultClick = (result: SearchResult) => {
    const user: User = {
      id: parseInt(result.id),
      name: result.name,
      username: result.username || result.name,
      profilePicture: result.profilePicture || result.avatar,
      bio: result.bio || result.subtitle,
      isFollowing: result.isFollowing,
      isMember: false
    };
    
    if (onSelectUser) {
      onSelectUser(user);
    }
    recordSearch(user.name);
  };

  const handleFollowToggle = (userId: string, isFollowing?: boolean) => {
    if (onAddUser) {
      const user = filteredResults.find(u => u.id === parseInt(userId));
      if (user) handleAddUser(user);
    } else {
      // Handle follow/unfollow
      const action = isFollowing ? 'unfollow' : 'follow';
      followMutation.mutate({ userId, action });
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
          <div className="mt-4">
            <SearchInput
              inputRef={inputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name or username..."
              isLoading={isLoading}
              showLocationButton={false}
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          <SearchResultsList
            results={Array.isArray(results) ? results : []}
            isLoading={isLoading}
            error={error}
            emptyMessage={searchQuery ? `No users found matching "${searchQuery}"` : "Start typing to search for users"}
            onResultClick={handleResultClick}
            onFollowToggle={handleFollowToggle}
            showFollowButton={true}
          />
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