
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

interface UnifiedHeaderProps {
  mode: 'logo' | 'back';
  title?: string;
}

export function UnifiedHeader({ mode, title }: UnifiedHeaderProps) {
  const [, navigate] = useLocation();

  const handleLogoClick = () => {
    navigate('/feed');
  };

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/feed');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 backdrop-blur-sm">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section */}
        <div className="flex items-center min-w-[120px]">
          {mode === 'logo' ? (
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity min-h-[44px] px-2"
              aria-label="Circles home"
            >
              <img 
                src="/logo-new.svg" 
                alt="Circles Logo" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-gray-900">Circles</span>
            </button>
          ) : (
            <button
              onClick={handleBackClick}
              className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Back to previous page"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
          )}
        </div>

        {/* Center section - Title */}
        <div className="flex-1 flex justify-center">
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">
              {title}
            </h1>
          )}
        </div>

        {/* Right section - Balance */}
        <div className="min-w-[120px]"></div>
      </div>
    </header>
  );
}
