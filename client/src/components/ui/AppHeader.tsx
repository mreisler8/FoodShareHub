
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  customBackAction?: () => void;
  rightContent?: React.ReactNode;
}

export function AppHeader({ 
  title, 
  showBackButton = true, 
  customBackAction,
  rightContent 
}: AppHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (customBackAction) {
      customBackAction();
    } else {
      window.history.back();
    }
  };

  const handleLogoClick = () => {
    setLocation('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
        {/* Left section: Back button or Logo */}
        <div className="flex items-center space-x-3">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
          ) : null}
          
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/logo.svg" 
              alt="Circles" 
              className="h-8 w-8"
            />
            {title && (
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h1>
            )}
          </button>
        </div>

        {/* Right section: Custom content */}
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}
