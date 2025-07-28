import { Link } from "wouter";
import { Heart, Eye, User, Tag, MapPin, Users, Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/Card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ModernListCardProps {
  list: {
    id: number;
    name: string;
    description?: string;
    createdById: number;
    createdBy?: {
      id: number;
      name: string;
      username: string;
    };
    coverImage?: string;
    tags?: string[];
    restaurantCount?: number;
    saveCount?: number;
    viewCount?: number;
    sharedWithCircles?: Array<{
      id: number;
      name: string;
    }>;
  };
}

export function ModernListCard({ list }: ModernListCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveListMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        return await apiRequest("DELETE", `/api/lists/${list.id}/save`);
      } else {
        return await apiRequest("POST", `/api/lists/${list.id}/save`);
      }
    },
    onSuccess: () => {
      setIsSaved(!isSaved);
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      toast({
        title: isSaved ? "List unsaved" : "List saved!",
        description: isSaved ? "Removed from your saved lists" : "Added to your saved lists",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save list",
        variant: "destructive",
      });
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        return await apiRequest("DELETE", `/api/users/${list.createdById}/follow`);
      } else {
        return await apiRequest("POST", `/api/users/${list.createdById}/follow`);
      }
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing ? "Unfollowed" : "Following!",
        description: isFollowing ? "You unfollowed this user" : "You're now following this user",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    saveListMutation.mutate();
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    followMutation.mutate();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: list.name,
        text: list.description || `Check out this list: ${list.name}`,
        url: `${window.location.origin}/lists/${list.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/lists/${list.id}`);
      toast({
        title: "Link copied!",
        description: "List link has been copied to your clipboard",
      });
    }
  };

  return (
    <Card className="group overflow-hidden bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all duration-300">
      <Link href={`/lists/${list.id}`}>
        <div className="cursor-pointer">
          {/* Cover Image */}
          <div className="relative h-48 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
            {list.coverImage ? (
              <img 
                src={list.coverImage} 
                alt={list.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 flex items-center justify-center">
                <div className="text-neutral-400">
                  <MapPin className="h-12 w-12" />
                </div>
              </div>
            )}
            
            {/* Quick Actions Overlay */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saveListMutation.isPending}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Header with Title and Creator */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-neutral-900 truncate group-hover:text-primary transition-colors">
                  {list.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-neutral-600">
                    by {list.createdBy?.name || 'Unknown'}
                  </span>
                </div>
              </div>
              
              {/* Follow Button */}
              {user && user.id !== list.createdById && (
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  className="ml-2"
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
            </div>

            {/* Description */}
            {list.description && (
              <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                {list.description}
              </p>
            )}

            {/* Tags */}
            {list.tags && list.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {list.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {list.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{list.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Shared with Circles */}
            {list.sharedWithCircles && list.sharedWithCircles.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-neutral-400" />
                <span className="text-sm text-neutral-600">
                  Shared to: {list.sharedWithCircles.map(c => c.name).join(', ')}
                </span>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-neutral-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{list.restaurantCount || 0} places</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{list.viewCount || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{list.saveCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}