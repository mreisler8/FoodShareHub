
import { ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function AppHeader({ title, showBackButton = true, onBack }: AppHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 h-14 min-h-[56px]">
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        
        {/* Logo/Title */}
        <div className="flex-1 flex justify-center">
          {!showBackButton ? (
            <Link href="/" aria-label="Circles Home" className="flex items-center">
              <img 
                src="/logo.svg" 
                alt="Circles" 
                className="h-8 w-auto"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.classList.remove('hidden');
                  }
                }}
              />
              <span className="hidden text-lg font-semibold text-gray-900">Circles</span>
            </Link>
          ) : (
            <h1 className="text-lg font-semibold text-gray-900 text-center flex-1">{title}</h1>
          )}
        </div>
        
        {/* Spacer for centering when back button is present */}
        {showBackButton && <div className="min-w-[44px]" />}
      </div>
    </header>
  );
}
