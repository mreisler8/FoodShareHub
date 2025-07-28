import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
}

export function AppHeader({ title, showBackButton = false, showLogo = true }: AppHeaderProps) {
  const [, navigate] = useLocation();

  const handleBackClick = () => {
    navigate("/feed");
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
          ) : showLogo ? (
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2 L28 28 L4 28 Z" fill="#FF6B35" stroke="#E55A2B" strokeWidth="1"/>
                <path d="M4 28 L28 28" stroke="#D4501F" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="18" r="2" fill="#C4321A"/>
                <circle cx="20" cy="20" r="2" fill="#C4321A"/>
                <circle cx="16" cy="14" r="1.5" fill="#C4321A"/>
                <circle cx="10" cy="24" r="1.5" fill="#C4321A"/>
                <ellipse cx="14" cy="22" rx="2" ry="1" fill="#FFB366" opacity="0.7"/>
                <ellipse cx="22" cy="24" rx="1.5" ry="0.8" fill="#FFB366" opacity="0.7"/>
              </svg>
              <span className="text-xl font-bold text-gray-900">Circles</span>
            </div>
          ) : null}
        </div>

        {/* Center - Title (only when back button is shown) */}
        {showBackButton && title && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
        )}

        {/* Right side - Empty for now */}
        <div className="w-11"></div>
      </div>
    </header>
  );
}