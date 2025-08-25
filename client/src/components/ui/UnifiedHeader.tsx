import React from 'react';

interface AppHeaderProps {
  showBackButton?: boolean;
  title?: string;
  onBackClick?: () => void;
}

export function AppHeader({ showBackButton = false, title, onBackClick }: AppHeaderProps) {
  return (
    <header className="bg-white shadow">
      <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center">
          {showBackButton && (
            <button onClick={onBackClick} className="mr-4">
              Back
            </button>
          )}
          <img
            src="/logo-brand.svg"
            alt="Circles Logo"
            className="h-8 w-8"
          />
          {title && <h1 className="text-xl font-bold ml-2">{title}</h1>}
        </div>
      </div>
    </header>
  );
}