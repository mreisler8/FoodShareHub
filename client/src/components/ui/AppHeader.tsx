
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

import ChatGPT_Image_Jul_28__2025__10_45_16_AM from "@assets/ChatGPT Image Jul 28, 2025, 10_45_16 AM.png";

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function AppHeader({ title, showBackButton = false, onBackClick }: AppHeaderProps) {
  const [, navigate] = useLocation();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate('/feed');
    }
  };

  const handleLogoClick = () => {
    navigate('/feed');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Back button or Logo */}
        <div className="flex items-center">
          {showBackButton ? (
            <button
              onClick={handleBackClick}
              className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back to feed"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
          ) : (
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Go to feed"
            >
              <img 
                src={ChatGPT_Image_Jul_28__2025__10_45_16_AM} 
                alt="Circles Pizza Logo" 
                className="h-8 w-8"
                onError={(e) => {
                  console.error('Logo failed to load:', e);
                  // Fallback to text if image fails
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <span className="text-xl font-bold text-gray-900">Circles</span>
            </button>
          )}
        </div>

        {/* Center - Title (only when back button is shown) */}
        {showBackButton && title && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
        )}

        {/* Right side - Empty for balance */}
        <div className="w-11"></div>
      </div>
    </header>
  );
}
