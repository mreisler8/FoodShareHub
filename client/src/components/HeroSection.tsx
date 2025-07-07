import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/Button';
import { PlusCircle, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PostModal } from '@/components/post/PostModal';
import { UnifiedSearchModal } from '@/components/search/UnifiedSearchModal';
import './HeroSection.css';

export function HeroSection() {
  const { user } = useAuth();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Handle Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Hi, {user?.name?.split(' ')[0] || 'Explorer'}! What's on your plate today?
            </h1>
            <p className="hero-subtitle">
              Discover restaurants, lists, and recommendations from your trusted network
            </p>
          </div>
          <div className="hero-actions">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setIsSearchModalOpen(true)}
              className="hero-search-btn"
              aria-label="Open search"
            >
              <Search className="h-5 w-5" />
              Search
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsPostModalOpen(true)}
              className="hero-cta"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              New Post
            </Button>
          </div>
        </div>
      </section>

      <PostModal
        open={isPostModalOpen}
        onOpenChange={setIsPostModalOpen}
      />
      
      <UnifiedSearchModal
        open={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
      />
    </>
  );
}