import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/Button';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { PostModal } from '@/components/post/PostModal';
import './HeroSection.css';

export function HeroSection() {
  const { user } = useAuth();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Explorer'}
            </h1>
            <p className="hero-subtitle">
              Ready to share your next great dining experience?
            </p>
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