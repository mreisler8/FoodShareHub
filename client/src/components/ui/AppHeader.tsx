
import { ChevronLeft } from 'lucide-react';
import { useLocation } from 'wouter';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function AppHeader({ title, showBackButton = true, onBack }: AppHeaderProps) {
  const [, navigate] = useLocation();

  const goBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
      {/* Left side - Back Button or Logo */}
      {showBackButton ? (
        <button 
          onClick={goBack} 
          aria-label="Go back" 
          className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-gray-700"/>
        </button>
      ) : (
        <div className="flex items-center">
          <img 
            src="/logo.svg" 
            alt="Circles" 
            className="h-8 w-auto" 
            onError={(e) => {
              // Hide the image and show fallback text immediately
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.logo-fallback') as HTMLSpanElement;
                if (fallback) {
                  fallback.style.display = 'inline-block';
                  fallback.classList.remove('hidden');
                }
              }
            }}
          />
          <span className="logo-fallback text-2xl font-bold text-primary hidden">
            Circles
          </span>
        </div>
      )}
      
      {/* Center - Page Title */}
      <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center">
        {title}
      </h1>
      
      {/* Right side - Spacer for symmetry */}
      <div className="w-[44px]" />
    </header>
  );
}
