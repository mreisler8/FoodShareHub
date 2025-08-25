import { useLocation } from "wouter";
import { routes } from "@/lib/routes";

export default function BackButton({ fallback = routes.feed }: { fallback?: string }) {
  const [location, setLocation] = useLocation();
  
  // In wouter, we can check if there's history by looking at window.history.length
  const canGoBack = window.history.length > 1;

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (canGoBack) {
          window.history.back();
        } else {
          setLocation(fallback);
        }
      }}
      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 transition-colors"
    >
      <span aria-hidden>←</span>
      <span>Back</span>
    </button>
  );
}