
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Circle } from "@shared/schema";
import { Users, MapPin } from "lucide-react";

interface CircleCardProps {
  circle?: Circle & {
    isJoined?: boolean;
  };
  // Mock data props
  name?: string;
  members?: number;
  icon?: string;
  description?: string;
}

export function CircleCard({ circle, name, members, icon, description }: CircleCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use props from either circle object or direct props (for mock data)
  const circleName = circle?.name || name || "";
  const memberCount = circle?.memberCount || members || 0;
  const circleIcon = icon || "👥";
  const circleDescription = circle?.description || description;
  const isJoined = circle?.isJoined || false;

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (circle?.id) {
        return await apiRequest(`/api/circles/${circle.id}/join`, {
          method: "POST",
        });
      }
      // For mock data, just simulate success
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "Joined Circle!",
        description: `You've joined ${circleName}`,
      });
      if (circle?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join circle",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-lg">
            {circleIcon}
          </div>
          <div>
            {circle?.id ? (
              <Link href={`/circles/${circle.id}`}>
                <h3 className="font-semibold hover:text-blue-600 cursor-pointer">
                  {circleName}
                </h3>
              </Link>
            ) : (
              <h3 className="font-semibold">{circleName}</h3>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{memberCount} members</span>
              {circle?.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{circle.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant={isJoined ? "outline" : "default"}
          onClick={() => !isJoined && joinMutation.mutate()}
          disabled={joinMutation.isPending || isJoined}
        >
          {isJoined ? "Joined" : "Join"}
        </Button>
      </div>

      {circleDescription && (
        <p className="text-sm text-gray-600 line-clamp-2">{circleDescription}</p>
      )}

      {circle?.tags && circle.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {circle.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
