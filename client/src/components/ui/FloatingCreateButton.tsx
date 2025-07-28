import { Plus } from 'lucide-react';
import { Button } from './button';

interface FloatingCreateButtonProps {
  onClick: () => void;
  'aria-label'?: string;
}

export function FloatingCreateButton({ onClick, 'aria-label': ariaLabel = 'Create new content' }: FloatingCreateButtonProps) {
  return (
    <Button
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-20 right-4 z-40 rounded-full w-14 h-14 shadow-lg min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary pb-safe"
      size="icon"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}