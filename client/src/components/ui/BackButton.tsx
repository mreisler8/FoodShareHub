import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export function BackButton() {
  const [, navigate] = useLocation();

  const handleClick = () => {
    // Try to go back in history, fallback to /feed
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/feed');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-gray-100 transition-colors"
      aria-label="Back"
    >
      <ArrowLeft className="h-5 w-5 text-gray-700" />
    </button>
  );
}