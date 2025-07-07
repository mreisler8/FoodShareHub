import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/Button';
import { PlusCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { PostModal } from '@/components/post/PostModal';
import './HeroSection.css';

export function HeroSection() {
  const { user } = useAuth();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or trigger search
      window.location.href = `/discover?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Hi, {user?.name?.split(' ')[0] || 'Explorer'}! What's on your plate today?
            </h1>
            <form onSubmit={handleSearch} className="hero-search">
              <div className="search-container">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Find a restaurant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </form>
          </div>
          <div className="hero-action">
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
    </>
  );
}