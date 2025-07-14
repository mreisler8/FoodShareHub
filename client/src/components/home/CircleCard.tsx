
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
  circle: Circle & {
    isJoined?: boolean;
  };
}

export function CircleCard({ circle }: CircleCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isJoined, setIsJoined] = useState(circle.isJoined || false);

  const joinMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/circles/${circle.id}/join`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      setIsJoined(true);
      toast({
        title: "Joined Circle!",
        description: `You've joined ${circle.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
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
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <Link href={`/circles/${circle.id}`}>
              <h3 className="font-semibold hover:text-blue-600 cursor-pointer">
                {circle.name}
              </h3>
            </Link>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{circle.memberCount} members</span>
              {circle.location && (
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

      {circle.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{circle.description}</p>
      )}

      {circle.tags && circle.tags.length > 0 && (
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
