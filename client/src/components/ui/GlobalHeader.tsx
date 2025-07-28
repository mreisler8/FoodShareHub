
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface GlobalHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  title,
  showBackButton = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = () => {
    navigate('/feed');
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Determine if we should show logo or back button based on current page
  const isMainPage = ['/feed', '/discover', '/circles', '/profile'].includes(location.pathname);
  const shouldShowLogo = isMainPage && !showBackButton;
  const shouldShowBackButton = !isMainPage || showBackButton;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto">
        {/* Left section - Logo or Back Button */}
        <div className="flex items-center">
          {shouldShowLogo ? (
            <button
              onClick={handleLogoClick}
              className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-1"
              aria-label="Go to feed"
            >
              <img 
                src="/logo-circles.png" 
                alt="Circles" 
                className="h-8 w-8 object-contain"
              />
            </button>
          ) : shouldShowBackButton ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="mr-2 min-h-[44px] min-w-[44px] p-2"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </Button>
          ) : null}
          
          {/* Page Title */}
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 ml-2">
              {title}
            </h1>
          )}
        </div>

        {/* Right section - Can be extended for additional actions */}
        <div className="flex items-center space-x-2">
          {/* Reserved for future actions like notifications, search, etc. */}
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
