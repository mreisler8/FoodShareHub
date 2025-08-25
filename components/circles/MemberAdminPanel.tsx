
import { useQuery } from "@tanstack/react-query";
import { MemberRow } from "./MemberRow";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface MemberAdminPanelProps {
  circleId: number;
  currentUserId: number;
  currentUserRole: "owner" | "admin" | "member";
}

export function MemberAdminPanel({ circleId, currentUserId, currentUserRole }: MemberAdminPanelProps) {
  const { data: members, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/circles/${circleId}/members`],
    queryFn: async () => {
      // Validate circleId
      if (!circleId || isNaN(circleId) || circleId <= 0) {
        throw new Error("Invalid circle ID");
      }

      const response = await fetch(`/api/circles/${circleId}/members`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to view members");
        }
        if (response.status === 404) {
          throw new Error("Circle not found");
        }
        throw new Error("Failed to fetch members");
      }

      return response.json();
    },
    enabled: !!circleId && circleId > 0,
    retry: (failureCount, error) => {
      // Don't retry on permission errors
      if (error?.message?.includes("permission") || error?.message?.includes("not found")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
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
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load members</p>
        </CardContent>
      </Card>
    );
  }

  const sortedMembers = members?.sort((a: any, b: any) => {
    // Sort by role priority: owner > admin > member
    const rolePriority = { owner: 3, admin: 2, member: 1 };
    return (rolePriority[b.role as keyof typeof rolePriority] || 0) - (rolePriority[a.role as keyof typeof rolePriority] || 0);
  }) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Members
          </div>
          <Badge variant="secondary">
            {members?.length || 0} members
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedMembers.map((member: any) => (
            <MemberRow
              key={member.id}
              member={member}
              circleId={circleId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
