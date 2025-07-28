import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function AppHeader({ title, showBackButton = false, onBack }: AppHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 h-14">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Logo - Always visible */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img 
              src="/logo.svg" 
              alt="Circles" 
              className="h-8 w-8 flex-shrink-0"
              onError={(e) => {
                // Fallback to a simple circle if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLDivElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div 
              className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm hidden flex-shrink-0"
              aria-label="Circles logo"
            >
              C
            </div>
          </div>
        </div>

        {/* Center - Title */}
        <div className="flex-1 flex justify-center px-4">
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">{title}</h1>
        </div>

        {/* Right side - placeholder for potential actions */}
        <div className="min-w-0 flex justify-end">
          {/* Space for future header actions */}
        </div>
      </div>
    </header>
  );
}