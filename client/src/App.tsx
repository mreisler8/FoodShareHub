import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import Router from "./components/Router";
import { useLocation } from "wouter";
import { useEffect } from "react";

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Redirect to auth if not authenticated and not already on auth page
    if (!isLoading && !user && location !== "/auth") {
      navigate("/auth");
    }
  }, [user, isLoading, location, navigate]);

  return (
    <ErrorBoundary>
      <Router />
      <Toaster />
      <SonnerToaster />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
