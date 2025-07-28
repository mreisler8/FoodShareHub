
import React from 'react';
import { useLocation } from 'wouter';
import { BackButton } from './BackButton';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export function AppHeader({ title, showBackButton = false }: AppHeaderProps) {
  const [, navigate] = useLocation();

  const handleLogoClick = () => {
    navigate('/feed');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-4 safe-area-x">
        {/* Left section */}
        <div className="flex items-center min-w-[120px]">
          {showBackButton ? (
            <BackButton />
          ) : (
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Circles home"
            >
              <img 
                src="/logo-new.svg" 
                alt="Circles Logo" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-gray-900">Circles</span>
            </button>
          )}
        </div>

        {/* Center section - Title */}
        <div className="flex-1 flex justify-center">
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">{title}</h1>
          )}
        </div>

        {/* Right section - Empty for balance */}
        <div className="min-w-[120px]"></div>
      </div>
    </header>
  );
}
