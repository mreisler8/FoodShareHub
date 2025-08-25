
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface JoinRequest {
  id: number;
  userId: number;
  circleId: number;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  user: {
    id: number;
    username: string;
    name: string;
    profilePicture?: string;
    bio?: string;
  };
}

interface JoinRequestCardProps {
  request: JoinRequest;
  circleId: number;
}

export function JoinRequestCard({ request, circleId }: JoinRequestCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const processRequestMutation = useMutation({
    mutationFn: async ({ action }: { action: "approve" | "deny" }) => {
      const response = await fetch(`/api/circles/${circleId}/requests/${request.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} request`);
      }

      return response.json();
    },
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/requests`] });
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}`] });
      
      toast({
        title: "Success",
        description: `Request ${action}d successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const handleApprove = async () => {
    setIsProcessing(true);
    processRequestMutation.mutate({ action: "approve" });
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    processRequestMutation.mutate({ action: "deny" });
  };

  if (request.status !== "pending") {
    return null;
  }

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.user.profilePicture} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{request.user.name}</span>
                <span className="text-sm text-muted-foreground">@{request.user.username}</span>
              </div>
              
              {request.user.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {request.user.bio}
                </p>
              )}
              
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(request.createdAt).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeny}
              disabled={isProcessing}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Deny
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
