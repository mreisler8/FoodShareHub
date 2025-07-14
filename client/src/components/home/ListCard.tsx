
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RestaurantList } from "@shared/schema";
import { Bookmark, User, MapPin, Clock } from "lucide-react";

interface ListCardProps {
  list?: RestaurantList & {
    creator?: {
      id: number;
      name: string;
      username: string;
    };
    restaurantCount?: number;
    isFollowing?: boolean;
    isSaved?: boolean;
  };
  // Mock data props
  title?: string;
  image?: string;
  user?: {
    name: string;
    handle: string;
    avatar: string;
  };
  saved?: boolean;
  followed?: boolean;
  restaurantCount?: number;
}

export function ListCard({ list, title, image, user, saved, followed, restaurantCount }: ListCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use props from either list object or direct props (for mock data)
  const listTitle = list?.name || title || "";
  const listImage = list?.coverImage || image;
  const listCreator = list?.creator || (user ? { name: user.name, username: user.handle.replace('@', ''), id: 0 } : null);
  const listRestaurantCount = list?.restaurantCount || restaurantCount || 0;
  
  const [isFollowing, setIsFollowing] = useState(list?.isFollowing || followed || false);
  const [isSaved, setIsSaved] = useState(list?.isSaved || saved || false);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (list?.creator?.id) {
        return await apiRequest(`/api/follow/${list.creator.id}`, {
          method: isFollowing ? "DELETE" : "POST",
        });
      }
      // For mock data, just simulate success
      return Promise.resolve();
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing ? "Unfollowed" : "Following!",
        description: `You ${isFollowing ? "unfollowed" : "are now following"} ${listCreator?.name}`,
      });
      if (list?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (list?.id) {
        return await apiRequest(`/api/lists/${list.id}/save`, {
          method: isSaved ? "DELETE" : "POST",
        });
      }
      // For mock data, just simulate success
      return Promise.resolve();
    },
    onSuccess: () => {
      setIsSaved(!isSaved);
      toast({
        title: isSaved ? "Removed from saved" : "Saved!",
        description: `List ${isSaved ? "removed from" : "added to"} your saved lists`,
      });
      if (list?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/saved-lists"] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save list",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
      {/* Cover Image */}
      {listImage && (
        <div className="relative">
          <img 
            src={listImage} 
            alt={listTitle}
            className="rounded-md w-full h-36 object-cover"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/20 text-white">
              {listRestaurantCount} places
            </Badge>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        {list?.id ? (
          <Link href={`/lists/${list.id}`}>
            <h3 className="font-semibold text-lg hover:text-blue-600 cursor-pointer">
              {listTitle}
            </h3>
          </Link>
        ) : (
          <h3 className="font-semibold text-lg">{listTitle}</h3>
        )}
        
        {list?.description && (
          <p className="text-gray-600 text-sm line-clamp-2">{list.description}</p>
        )}

        {/* Tags */}
        {list?.tags && list.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {list.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {list?.primaryLocation && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{list.primaryLocation}</span>
            </div>
          )}
          {list?.createdAt && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(list.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Creator and Actions */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-gray-600" />
              </div>
            )}
            <span className="text-sm text-gray-600">
              {user?.handle || `@${listCreator?.username}`}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1"
            >
              <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? "Saved" : "Save"}
            </Button>
            
            {listCreator && (
              <Button 
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
