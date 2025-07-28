
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
}

/**
 * @deprecated Use AppHeader with showBackButton=true instead
 * This component will be removed in the next version
 */
export function BackButton({ onClick, className = '' }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.history.back();
    }
  };

  if (process.env.NODE_ENV === 'development') {
    console.warn('BackButton is deprecated. Use AppHeader with showBackButton=true instead.');
  }

  return (
    <button
      onClick={handleClick}
      className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5 text-gray-700" />
    </button>
  );
}
