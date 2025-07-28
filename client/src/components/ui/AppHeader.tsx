
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
    <header className="flex items-center justify-between bg-white p-4 shadow-sm relative">
      {/* Back Button */}
      {showBackButton ? (
        <button 
          onClick={goBack} 
          aria-label="Back" 
          className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-foreground"/>
        </button>
      ) : (
        <div className="w-[44px]" />
      )}
      
      {/* Logo with proper fallback */}
      <div className="flex-1 text-center">
        <img 
          src="/logo.svg" 
          alt="Circles" 
          className="h-6 mx-auto" 
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
        <span className="logo-fallback text-xl font-bold text-primary hidden">
          Circles
        </span>
      </div>
      
      {/* Title overlay */}
      <h1 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold pointer-events-none">
        {title}
      </h1>
      
      {/* Right spacer for symmetry */}
      <div className="w-[44px]" />
    </header>
  );
}
