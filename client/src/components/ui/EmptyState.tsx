import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    href?: string;
  };
  children?: React.ReactNode;
}

export default function EmptyState({ 
  icon: Icon, 
  emoji, 
  title, 
  description, 
  action, 
  children 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4">
        {emoji && <div className="text-4xl mb-2">{emoji}</div>}
        {Icon && <Icon className="h-12 w-12 text-muted-foreground" />}
      </div>
      
      <p className="text-lg font-medium">{title || "Nothing here yet"}</p>
      
      <p className="text-sm text-muted-foreground mb-4">{description || "Start by tapping the + button below"}</p>
      
      {action && (
        <Button 
          onClick={action.onClick}
          variant="default"
          className="min-h-[44px]"
        >
          {action.label || "Create Something"}
        </Button>
      )}
      
      {children}
    </div>
  );
}