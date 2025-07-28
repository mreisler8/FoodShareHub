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
    <header className="flex items-center justify-between bg-white p-4 shadow-sm">
      {showBackButton ? (
        <button 
          onClick={goBack} 
          aria-label="Back" 
          className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft className="h-6 w-6 text-foreground"/>
        </button>
      ) : (
        <div className="w-10" />
      )}
      
      <div className="flex-1 text-center">
        <img 
          src="/logo.svg" 
          alt="Circles" 
          className="h-6 mx-auto" 
          onError={(e) => {
            // Fallback to text if logo doesn't exist
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLSpanElement;
            if (fallback) {
              fallback.style.display = 'block';
              fallback.classList.remove('sr-only');
            }
          }}
        />
        <span className="sr-only text-xl font-bold text-primary" style={{ display: 'none' }}>Circles</span>
      </div>
      
      <h1 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold pointer-events-none">
        {title}
      </h1>
      
      <div className="w-10" /> {/* spacer for symmetry */}
    </header>
  );
}