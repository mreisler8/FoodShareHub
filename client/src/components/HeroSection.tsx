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

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">Circles</h1>
          <p className="hero-subtitle">
            Trusted restaurant recommendations from your inner circle
          </p>
        </div>

        <div className="hero-actions">
          <Button
            variant="outline"
            size="md"
            className="hero-search-btn"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            Search restaurants, dishes, or friends
          </Button>

          <Button
            variant="primary"
            size="md"
            className="hero-cta"
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