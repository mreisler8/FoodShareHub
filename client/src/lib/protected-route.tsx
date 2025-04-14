import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps } from "wouter";

interface ProtectedRouteProps extends Omit<RouteProps, 'component'> {
  component: React.ComponentType;
  redirectTo?: string;
}

export function ProtectedRoute({
  path,
  component: Component,
  redirectTo = "/auth",
  ...rest
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Redirect to auth page if not authenticated
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to={redirectTo} />
      </Route>
    );
  }

  // Render the protected component if authenticated
  return <Route path={path} component={Component} {...rest} />;
}