import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "./Button";
import { UnifiedSearchModal } from "./search/UnifiedSearchModal";
import { useLocation } from "wouter";
import "./HeroSection.css";

export function HeroSection() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleCreatePost = () => {
    setLocation("/create-post");
  };

  const handleSearchClick = () => {
    setIsSearchOpen(true);

    // Pre-request location when user opens search for better UX
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained for search:', position.coords);
        },
        (error) => {
          console.log('Location access denied or failed:', error);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }
  };

  return (
    <section className="hero-section py-4 px-6 text-center border-b border-soft-sand-30">
      <div className="hero-content content-spacing">
        <div className="hero-text">
          <h1 className="hero-title">Circles</h1>
          <p className="hero-subtitle">
            Trusted restaurant recommendations from your inner circle
          </p>
        </div>

        <div className="hero-actions flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md">
          <Button
            variant="outline"
            size="md"
            className="hero-search-btn btn-responsive focus-improved w-full sm:flex-1"
            onClick={handleSearchClick}
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Search restaurants, dishes, or friends</span>
            <span className="sm:hidden">Search</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            className="hero-cta btn-responsive focus-improved w-full sm:flex-1"
            onClick={handleCreatePost}
          >
            <Plus className="h-4 w-4" />
            Share Experience
          </Button>
        </div>
      </div>

      <UnifiedSearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </section>
  );
}