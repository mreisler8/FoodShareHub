import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Bookmark, Users, Globe, Eye, Lock, MapPin, MoreHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ListFeedCardProps {
  list: {
    id: number;
    name: string;
    description?: string;
    coverImage?: string;
    tags?: string[];
    type: "restaurant" | "dish";
    audience: "profile" | "circle" | "public";
    shareWithCircle?: boolean;
    makePublic?: boolean;
    viewCount: number;
    saveCount: number;
    reactionCount: number;
    createdAt: string;
    updatedAt: string;
    createdById: number;
    // Creator info
    creator?: {
      id: number;
      name: string;
      username: string;
      profilePicture?: string;
    };
    // List items preview (first few items)
    items?: Array<{
      id: number;
      name: string;
      rating?: number;
      city?: string;
      mediaUrl?: string;
    }>;
    // Share destination info
    sharedToCircle?: {
      id: number;
      name: string;
    };
  };
  showActions?: boolean;
  onListClick?: (listId: number) => void;
}

export function ListFeedCard({ list, showActions = true, onListClick }: ListFeedCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnimating, setIsAnimating] = useState({ save: false, react: false });

  // Check if current user has saved/reacted to this list
  const { data: saveStatus } = useQuery({
    queryKey: ['/api/saved-lists', list.id, 'status'],
    queryFn: () => apiRequest(`/api/saved-lists/${list.id}/status`),
    enabled: showActions && !!list.id
  });

  const { data: reactionStatus } = useQuery({
    queryKey: ['/api/list-reactions', list.id],
    queryFn: () => apiRequest(`/api/list-reactions/${list.id}`),
    enabled: showActions && !!list.id
  });

  // Save/unsave list mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (saveStatus?.isSaved) {
        return apiRequest(`/api/saved-lists/${list.id}`, {
          method: 'DELETE'
        });
      } else {
        return apiRequest('/api/saved-lists', {
          method: 'POST',
          body: { listId: list.id }
        });
      }
    },
    onMutate: () => {
      setIsAnimating(prev => ({ ...prev, save: true }));
      setTimeout(() => setIsAnimating(prev => ({ ...prev, save: false })), 200);
    },
    onSuccess: () => {
      // Invalidate queries to refresh status
      queryClient.invalidateQueries({ queryKey: ['/api/saved-lists', list.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      
      toast({
        title: saveStatus?.isSaved ? "List removed from saved" : "List saved!",
        description: saveStatus?.isSaved ? "List removed from your saved lists" : "List saved to your profile",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save list. Please try again.",
        variant: "destructive",
      });
      console.error('Error saving list:', error);
    }
  });

  // React/unreact to list mutation
  const reactionMutation = useMutation({
    mutationFn: async () => {
      if (reactionStatus?.hasReacted) {
        return apiRequest(`/api/list-reactions/${list.id}/react`, {
          method: 'DELETE'
        });
      } else {
        return apiRequest('/api/list-reactions', {
          method: 'POST',
          body: { listId: list.id, reaction: 'like' }
        });
      }
    },
    onMutate: () => {
      setIsAnimating(prev => ({ ...prev, react: true }));
      setTimeout(() => setIsAnimating(prev => ({ ...prev, react: false })), 200);
    },
    onSuccess: () => {
      // Invalidate queries to refresh status
      queryClient.invalidateQueries({ queryKey: ['/api/list-reactions', list.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      
      toast({
        title: reactionStatus?.hasReacted ? "Reaction removed" : "List liked!",
        description: reactionStatus?.hasReacted ? "Reaction removed" : "Thanks for liking this list",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to react to list. Please try again.",
        variant: "destructive",
      });
      console.error('Error reacting to list:', error);
    }
  });

  const getVisibilityInfo = () => {
    if (list.makePublic || list.audience === "public") {
      return { icon: Globe, text: "Public", color: "text-green-600" };
    } else if (list.shareWithCircle || list.audience === "circle") {
      return { 
        icon: Users, 
        text: list.sharedToCircle ? `@${list.sharedToCircle.name}` : "Circle",
        color: "text-blue-600" 
      };
    } else if (list.audience === "profile") {
      return { icon: Eye, text: "Profile", color: "text-orange-600" };
    } else {
      return { icon: Lock, text: "Private", color: "text-gray-600" };
    }
  };

  const visibilityInfo = getVisibilityInfo();
  const VisibilityIcon = visibilityInfo.icon;

  const handleCardClick = () => {
    if (onListClick) {
      onListClick(list.id);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveMutation.mutate();
  };

  const handleReact = (e: React.MouseEvent) => {
    e.stopPropagation();
    reactionMutation.mutate();
  };

  return (
    <Card 
      className={cn(
        "w-full rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
        "border-slate-200 bg-white"
      )}
      onClick={handleCardClick}
    >
      {/* Cover Image */}
      {list.coverImage && (
        <div className="relative">
          <img
            src={list.coverImage}
            alt={list.name}
            className="w-full h-48 object-cover rounded-t-xl"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-black/70 text-white border-0">
              {list.items?.length || 0} {(list.items?.length || 0) === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        {/* Creator Info */}
        {list.creator && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={list.creator.profilePicture} />
              <AvatarFallback className="text-xs">
                {list.creator.name?.split(' ').map(n => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{list.creator.name}</p>
              <p className="text-xs text-slate-500">@{list.creator.username}</p>
            </div>
          </div>
        )}

        {/* List Title */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900 leading-tight">
            {list.name}
          </h3>
          {list.description && (
            <p className="text-sm text-slate-600 line-clamp-2">
              {list.description}
            </p>
          )}
        </div>

        {/* Share Destination Badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs", visibilityInfo.color)}
          >
            <VisibilityIcon className="h-3 w-3 mr-1" />
            Shared to: {visibilityInfo.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* List Items Preview */}
        {list.items && list.items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Featured items:</p>
            <div className="space-y-1">
              {list.items.slice(0, 3).map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">{index + 1}.</span>
                  <span className="text-slate-900">{item.name}</span>
                  {item.rating && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-slate-600">{item.rating}</span>
                    </div>
                  )}
                </div>
              ))}
              {(list.items?.length || 0) > 3 && (
                <p className="text-xs text-slate-500 pl-4">
                  +{(list.items?.length || 0) - 3} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {list.tags && list.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {list.tags.slice(0, 4).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                #{tag}
              </Badge>
            ))}
            {list.tags.length > 4 && (
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-500">
                +{list.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Actions Bar */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{list.viewCount || 0} views</span>
              <span>{list.saveCount || 0} saves</span>
              <span>{list.reactionCount || 0} reactions</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Save Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className={cn(
                  "h-8 px-2 transition-all duration-200",
                  isAnimating.save && "scale-110",
                  saveStatus?.isSaved 
                    ? "text-blue-600 hover:text-blue-700" 
                    : "text-slate-500 hover:text-blue-600"
                )}
              >
                <Bookmark 
                  className={cn(
                    "h-4 w-4", 
                    saveStatus?.isSaved && "fill-current"
                  )} 
                />
              </Button>

              {/* React Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReact}
                disabled={reactionMutation.isPending}
                className={cn(
                  "h-8 px-2 transition-all duration-200",
                  isAnimating.react && "scale-110",
                  reactionStatus?.hasReacted 
                    ? "text-red-600 hover:text-red-700" 
                    : "text-slate-500 hover:text-red-600"
                )}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4", 
                    reactionStatus?.hasReacted && "fill-current"
                  )} 
                />
              </Button>

              {/* More Actions */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-500 hover:text-slate-700"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}