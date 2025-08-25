import { Link, useLocation } from "wouter";
import { routes } from "@/lib/routes";
import { ArrowLeft } from "lucide-react";

export default function AppHeader() {
  const [location, navigate] = useLocation();
  const showBack = location !== routes.feed && location !== '/feed';

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to feed
      navigate(routes.feed);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-screen-md items-center justify-between px-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Back button - hidden on feed, visible everywhere else */}
          {showBack ? (
            <button
              type="button"
              aria-label="Go back"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back</span>
            </button>
          ) : (
            // Invisible placeholder to prevent layout shift
            <div className="w-[73px]" aria-hidden="true" />
          )}
          
          {/* Logo - always navigates to feed */}
          <Link to={routes.feed} className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Go to feed">
            <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold text-gray-900">Circles</span>
          </Link>
        </div>
        <nav className="flex items-center gap-2" />
      </div>
    </header>
  );
}