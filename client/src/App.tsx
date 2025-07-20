import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import Router from "./components/Router";
import BottomNavigation from "./components/navigation/BottomNavigation";
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

  // Show bottom navigation on authenticated pages (not on auth page)
  const showBottomNav = user && location !== "/auth";

  return (
    <ErrorBoundary>
      <div className={showBottomNav ? "pb-20" : ""} style={{ margin: 0, padding: 0 }}>
        <Router />
      </div>
      {showBottomNav && <BottomNavigation />}
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

// Development button validation
if (import.meta.env.DEV) {
  import('./utils/buttonValidation').then(({ ButtonValidator }) => {
    // Add global validation function for development
    (window as any).validateButtons = () => {
      const results = ButtonValidator.validateAllButtons();
      ButtonValidator.logValidationResults(results);
      return results;
    };

    // Run validation on page load after a delay
    setTimeout(() => {
      console.log('🔧 Development Mode: Run validateButtons() in console to check button integrity');
    }, 2000);
  });
}