
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { GlobalErrorBoundary, setupGlobalErrorHandling } from "./components/common/GlobalErrorBoundary";
import { SmartPollingProvider } from "./components/optimized/SmartPollingProvider";
import { FloatingCreateButton } from "./components/common/FloatingCreateButton";
import Router from "./components/Router";
import BottomNavigation from "./components/navigation/BottomNavigation";
import { RouteTransition } from "./components/transitions/RouteTransition";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { logViewportInfo } from "./utils/viewportDebug";

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Redirect to auth if not authenticated and not already on auth page
    if (!isLoading && !user && location !== "/auth") {
      navigate("/auth");
    }
  }, [user, isLoading, location, navigate]);

  // Show bottom navigation and floating create button on authenticated pages (not on auth page)
  const showBottomNav = user && location !== "/auth";
  const showFloatingCreate = user && location !== "/auth";

  return (
    <ErrorBoundary>
      <div className={`mobile-page ${showBottomNav ? "mobile-content" : ""}`}>
        <RouteTransition>
          <Router />
        </RouteTransition>
      </div>
      {showBottomNav && <BottomNavigation />}
      {showFloatingCreate && <FloatingCreateButton />}
      <Toaster />
      <SonnerToaster />
    </ErrorBoundary>
  );
}

function App() {
  // Setup global error handling on app initialization
  useEffect(() => {
    setupGlobalErrorHandling();
    // Debug viewport in development
    if (import.meta.env.DEV) {
      logViewportInfo();
    }
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SmartPollingProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SmartPollingProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
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
