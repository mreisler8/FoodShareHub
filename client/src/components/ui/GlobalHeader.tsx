
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

interface GlobalHeaderProps {
  showBackButton?: boolean;
  title?: string;
  onBackClick?: () => void;
}

export function GlobalHeader({ showBackButton = false, title, onBackClick }: GlobalHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      window.history.back();
    }
  };

  const handleLogoClick = () => {
    setLocation('/feed');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left side - Back button or spacer */}
        <div className="flex items-center min-w-[44px]">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="p-2 h-10 w-10 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
          )}
        </div>

        {/* Center - Logo and title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLogoClick}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            aria-label="Go to feed"
          >
            <img
              src="/logo-brand.svg"
              alt="Circles Logo"
              className="h-8 w-8"
            />
            {title && (
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            )}
          </button>
        </div>

        {/* Right side - Spacer for balance */}
        <div className="min-w-[44px]"></div>
      </div>
    </header>
  );
}
