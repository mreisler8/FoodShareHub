import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps } from "wouter";
import { InlineError } from "@/components/ui/InlineError";
import { getErrorMessage } from "@/lib/error-utils";

interface ProtectedRouteProps extends Omit<RouteProps, 'component'> {
  component: React.ComponentType<any>;
  redirectTo?: string;
}

export function ProtectedRoute({
  path,
  component: Component,
  redirectTo = "/auth",
  ...rest
}: ProtectedRouteProps) {
  const { user, isLoading, error } = useAuth();

  return (
    <Route path={path}>
      {() => {
        // Show loading indicator while checking auth state
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        // Show inline error if auth check failed (not 401)
        if (error && error !== 'unauthenticated') {
          return (
            <div className="flex items-center justify-center min-h-screen p-4">
              <InlineError 
                message={getErrorMessage(error)} 
                onRetry={() => window.location.reload()}
              />
            </div>
          );
        }

        // Redirect to auth page if not authenticated
        if (!user) {
          return <Redirect to={redirectTo} />;
        }

        // Render the protected component if authenticated
        return <Component {...rest} />;
      }}
    </Route>
  );
}