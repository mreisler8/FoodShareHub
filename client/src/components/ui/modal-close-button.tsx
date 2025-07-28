import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalCloseButtonProps {
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'lg' | 'icon';
  position?: 'absolute' | 'relative';
}

/**
 * Standardized modal close button component
 * Uses DialogClose to ensure proper modal closing behavior
 * Provides consistent styling and accessibility across all modals
 */
export function ModalCloseButton({
  onClick,
  className,
  variant = 'ghost',
  size = 'sm',
  position = 'absolute'
}: ModalCloseButtonProps) {
  const baseClasses = cn(
    'z-50 rounded-sm transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    position === 'absolute' && 'absolute right-4 top-4',
    position === 'relative' && 'relative',
    className
  );

  return (
    <DialogClose asChild>
      <Button
        variant={variant}
        size={size}
        onClick={onClick}
        className={baseClasses}
        aria-label="Close modal"
      >
        <X className={cn(
          size === 'sm' && 'h-4 w-4',
          size === 'lg' && 'h-6 w-6',
          size === 'icon' && 'h-4 w-4'
        )} />
        <span className="sr-only">Close</span>
      </Button>
    </DialogClose>
  );
}