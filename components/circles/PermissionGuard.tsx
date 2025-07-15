
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AccessDeniedView } from "./AccessDeniedView";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface AccessResult {
  allowed: boolean;
  reason?: "not_member" | "not_authenticated" | "circle_not_found" | "circle_private";
  circle?: {
    id: number;
    name: string;
    isPrivate: boolean;
  };
  user?: {
    id: number;
    username: string;
  };
}

interface PermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ children, fallback }: PermissionGuardProps) {
  const params = useParams();
  const circleId = params.circleId as string;
  const [refreshKey, setRefreshKey] = useState(0);

  const { 
    data: accessResult, 
    isLoading, 
    error,
    refetch 
  } = useQuery<AccessResult>({
    queryKey: [`/api/circles/${circleId}/access`, refreshKey],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/access`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { 
            allowed: false, 
            reason: "circle_not_found" as const 
          };
        }
        if (response.status === 401) {
          return { 
            allowed: false, 
            reason: "not_authenticated" as const 
          };
        }
        throw new Error("Failed to check access permissions");
      }

      return response.json();
    },
    enabled: !!circleId,
    retry: (failureCount, error: any) => {
      // Don't retry on expected auth/not found errors
      if (error?.message?.includes("not found") || error?.message?.includes("not authenticated")) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 60000, // Cache access check for 1 minute
  });

  const handleRetry = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <LoadingSpinner className="h-8 w-8" />
        <p className="text-sm text-muted-foreground">Checking access permissions...</p>
      </div>
    );
  }

  // Error state (network/server errors)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to verify access permissions. Please try again.
          </AlertDescription>
        </Alert>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Access denied
  if (!accessResult?.allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <AccessDeniedView reason={accessResult?.reason} circle={accessResult?.circle} />;
  }

  // Access granted
  return <>{children}</>;
}
import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccessDeniedView } from "./AccessDeniedView";
import { Skeleton } from "@/components/ui/skeleton";

interface PermissionGuardProps {
  circleId: number;
  children: ReactNode;
  requiredPermission?: "view" | "post" | "admin";
  fallback?: ReactNode;
}

export function PermissionGuard({ 
  circleId, 
  children, 
  requiredPermission = "view", 
  fallback 
}: PermissionGuardProps) {
  const { data: accessCheck, isLoading, error } = useQuery({
    queryKey: [`/api/circles/${circleId}/access`],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/access`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to check access");
      }

      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !accessCheck?.allowed) {
    return fallback || <AccessDeniedView />;
  }

  // Check specific permissions based on user's role
  const userRole = accessCheck.role;
  const hasPermission = checkPermission(userRole, requiredPermission);

  if (!hasPermission) {
    return fallback || <AccessDeniedView />;
  }

  return <>{children}</>;
}

function checkPermission(userRole: string, requiredPermission: string): boolean {
  switch (requiredPermission) {
    case "view":
      return ["member", "admin", "owner"].includes(userRole);
    case "post":
      return ["member", "admin", "owner"].includes(userRole);
    case "admin":
      return ["admin", "owner"].includes(userRole);
    default:
      return false;
  }
}
