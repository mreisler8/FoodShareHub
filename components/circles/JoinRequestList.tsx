
import { useQuery } from "@tanstack/react-query";
import { JoinRequestCard } from "./JoinRequestCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock } from "lucide-react";

interface JoinRequestListProps {
  circleId: number;
}

export function JoinRequestList({ circleId }: JoinRequestListProps) {
  const { data: requests, isLoading, error } = useQuery({
    queryKey: [`/api/circles/${circleId}/requests`],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/requests`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch join requests");
      }

      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Join Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Join Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load join requests</p>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests?.filter((req: any) => req.status === "pending") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Join Requests
          </div>
          {pendingRequests.length > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              <Clock className="h-3 w-3 mr-1" />
              {pendingRequests.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pending join requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request: any) => (
              <JoinRequestCard
                key={request.id}
                request={request}
                circleId={circleId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
