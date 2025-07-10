import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Users, MapPin, Plus, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
  bio?: string;
  diningInterests: string[];
  preferredCuisines: string[];
  preferredLocation?: string;
  isFollowing: boolean;
  mutualConnections: number;
  followerCount: number;
  followingCount: number;
  mutualCircles: Array<{
    id: number;
    name: string;
  }>;
  canAddToCircle: boolean;
  type: 'user';
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect?: (user: User) => void;
  showAddToCircle?: boolean;
  availableCircles?: Array<{
    id: number;
    name: string;
  }>;
}

export function UserSearchModal({ 
  isOpen, 
  onClose, 
  onUserSelect, 
  showAddToCircle = false,
  availableCircles = []
}: UserSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCircle, setSelectedCircle] = useState<number | null>(null);
  const [addedUsers, setAddedUsers] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // User search query
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['/api/users', debouncedSearchTerm],
    queryFn: () => apiRequest(`/api/users?query=${encodeURIComponent(debouncedSearchTerm)}`),
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 30000,
  });

  // Add user to circle mutation
  const addToCircleMutation = useMutation({
    mutationFn: async ({ userId, circleId }: { userId: number; circleId: number }) => {
      return apiRequest(`/api/circles/${circleId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    },
    onSuccess: (_, { userId, circleId }) => {
      setAddedUsers(prev => new Set([...prev, userId]));
      toast({
        title: 'User added to circle!',
        description: 'The user has been successfully added to the circle.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/members`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding user',
        description: error.message || 'Failed to add user to circle',
        variant: 'destructive',
      });
    },
  });

  // Follow user mutation
  const followMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/follow/${userId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Following user',
        description: 'You are now following this user.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error following user',
        description: error.message || 'Failed to follow user',
        variant: 'destructive',
      });
    },
  });

  const handleAddToCircle = (user: User) => {
    if (!selectedCircle) {
      toast({
        title: 'Select a circle',
        description: 'Please select a circle to add the user to.',
        variant: 'destructive',
      });
      return;
    }

    addToCircleMutation.mutate({ userId: user.id, circleId: selectedCircle });
  };

  const handleFollowUser = (user: User) => {
    if (!user.isFollowing) {
      followMutation.mutate(user.id);
    }
  };

  const handleUserSelect = (user: User) => {
    onUserSelect?.(user);
    onClose();
  };

  const renderUserCard = (user: User) => (
    <Card key={user.id} className="mb-3 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.profilePicture} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{user.name}</h3>
              <span className="text-xs text-muted-foreground">@{user.username}</span>
            </div>
            
            {user.bio && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{user.bio}</p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{user.followerCount} followers</span>
              </div>
              {user.mutualConnections > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{user.mutualConnections} mutual</span>
                </div>
              )}
              {user.preferredLocation && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{user.preferredLocation}</span>
                </div>
              )}
            </div>
            
            {user.preferredCuisines.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {user.preferredCuisines.slice(0, 3).map(cuisine => (
                  <Badge key={cuisine} variant="secondary" className="text-xs">
                    {cuisine}
                  </Badge>
                ))}
                {user.preferredCuisines.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.preferredCuisines.length - 3} more
                  </Badge>
                )}
              </div>
            )}
            
            {user.mutualCircles.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-xs text-muted-foreground">In circles:</span>
                {user.mutualCircles.map(circle => (
                  <Badge key={circle.id} variant="outline" className="text-xs">
                    {circle.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            {showAddToCircle && selectedCircle && (
              <Button
                size="sm"
                variant={addedUsers.has(user.id) ? "secondary" : "default"}
                onClick={() => handleAddToCircle(user)}
                disabled={addToCircleMutation.isPending || addedUsers.has(user.id)}
              >
                {addToCircleMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : addedUsers.has(user.id) ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                <span className="ml-1">
                  {addedUsers.has(user.id) ? 'Added' : 'Add'}
                </span>
              </Button>
            )}
            
            <Button
              size="sm"
              variant={user.isFollowing ? "secondary" : "outline"}
              onClick={() => handleFollowUser(user)}
              disabled={followMutation.isPending}
            >
              {followMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : user.isFollowing ? (
                'Following'
              ) : (
                'Follow'
              )}
            </Button>
            
            {onUserSelect && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUserSelect(user)}
              >
                Select
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, username, or bio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {showAddToCircle && availableCircles.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select circle to add users to:</label>
              <select
                value={selectedCircle || ''}
                onChange={(e) => setSelectedCircle(Number(e.target.value) || null)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a circle...</option>
                {availableCircles.map(circle => (
                  <option key={circle.id} value={circle.id}>
                    {circle.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Searching users...</span>
              </div>
            )}
            
            {error && (
              <div className="text-center py-8 text-muted-foreground">
                Error searching users. Please try again.
              </div>
            )}
            
            {!isLoading && !error && searchTerm.length >= 2 && users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching "{searchTerm}"
              </div>
            )}
            
            {!isLoading && !error && searchTerm.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                Enter at least 2 characters to search for users
              </div>
            )}
            
            {!isLoading && !error && users.length > 0 && (
              <div className="space-y-3">
                {users.map(renderUserCard)}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}