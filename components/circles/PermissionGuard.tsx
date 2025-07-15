
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
      // Validate circleId before making request
      if (!circleId || isNaN(parseInt(circleId))) {
        return { 
          allowed: false, 
          reason: "circle_not_found" as const 
        };
      }

      try {
        const response = await fetch(`/api/circles/${circleId}/access`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
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
          if (response.status === 403) {
            return { 
              allowed: false, 
              reason: "not_member" as const 
            };
          }
          throw new Error(`HTTP ${response.status}: Failed to check access permissions`);
        }

        return response.json();
      } catch (fetchError) {
        console.error('Permission check failed:', fetchError);
        throw new Error("Network error while checking access permissions");
      }
    },
    enabled: !!circleId,
    retry: (failureCount, error: any) => {
      // Don't retry on expected auth/not found errors
      if (error?.message?.includes("not found") || 
          error?.message?.includes("not authenticated") ||
          error?.message?.includes("HTTP 403") ||
          error?.message?.includes("HTTP 404")) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 30000, // Cache access check for 30 seconds (reduced for better UX)
    gcTime: 60000, // Keep in cache for 1 minute
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

