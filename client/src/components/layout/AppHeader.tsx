import { Link, useLocation } from "wouter";
import { routes } from "@/lib/routes";
import BackButton from "@/components/ui/BackButton";

export default function AppHeader() {
  const [location] = useLocation();
  const showBack = location !== routes.feed;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-screen-md items-center justify-between px-3">
        <div className="flex items-center gap-2">
          {showBack ? <BackButton /> : null}
          <Link to={routes.feed} className="flex items-center gap-2" aria-label="Go to feed">
            {/* Temporarily render a text mark; swap in your logo later */}
            <div className="h-6 w-6 rounded-full border" aria-hidden />
            <span className="font-semibold">Circles</span>
          </Link>
        </div>
        <nav className="flex items-center gap-2" />
      </div>
    </header>
  );
}