
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
  list: RestaurantList & {
    creator?: {
      id: number;
      name: string;
      username: string;
    };
    restaurantCount?: number;
    isFollowing?: boolean;
    isSaved?: boolean;
  };
}

export function ListCard({ list }: ListCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(list.isFollowing || false);
  const [isSaved, setIsSaved] = useState(list.isSaved || false);

  const followMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/follow/${list.creator?.id}`, {
        method: isFollowing ? "DELETE" : "POST",
      });
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing ? "Unfollowed" : "Following!",
        description: `You ${isFollowing ? "unfollowed" : "are now following"} ${list.creator?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
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
      return await apiRequest(`/api/lists/${list.id}/save`, {
        method: isSaved ? "DELETE" : "POST",
      });
    },
    onSuccess: () => {
      setIsSaved(!isSaved);
      toast({
        title: isSaved ? "Removed from saved" : "Saved!",
        description: `List ${isSaved ? "removed from" : "added to"} your saved lists`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-lists"] });
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
      {list.coverImage && (
        <div className="relative">
          <img 
            src={list.coverImage} 
            alt={list.name}
            className="rounded-md w-full h-36 object-cover"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/20 text-white">
              {list.restaurantCount || 0} places
            </Badge>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        <Link href={`/lists/${list.id}`}>
          <h3 className="font-semibold text-lg hover:text-blue-600 cursor-pointer">
            {list.name}
          </h3>
        </Link>
        
        {list.description && (
          <p className="text-gray-600 text-sm line-clamp-2">{list.description}</p>
        )}

        {/* Tags */}
        {list.tags && list.tags.length > 0 && (
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
          {list.primaryLocation && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{list.primaryLocation}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(list.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Creator and Actions */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-gray-600" />
            </div>
            <span className="text-sm text-gray-600">@{list.creator?.username}</span>
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
            
            {list.creator && (
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
