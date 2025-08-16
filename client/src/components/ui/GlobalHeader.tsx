import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export interface GlobalHeaderProps {
  title?: string;
  backButton?: boolean;
  rightSlot?: React.ReactNode;
}

export function GlobalHeader({ title, backButton, rightSlot }: GlobalHeaderProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    // Try to go back in history, fallback to home if no history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  return (
    <header role="banner" className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {backButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              aria-label="Go back"
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {title && (
            <h1 className="font-semibold text-foreground truncate">{title}</h1>
          )}
        </div>
        {rightSlot && (
          <div className="flex items-center gap-2">
            {rightSlot}
          </div>
        )}
      </div>
    </header>
  );
}