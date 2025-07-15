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
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">
        {emoji && <div className="text-4xl mb-2">{emoji}</div>}
        {Icon && <Icon size={48} className="text-gray-400 mx-auto" />}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-gray-600 mb-6 max-w-sm">{description}</p>
      )}
      
      {action && (
        <Button 
          onClick={action.onClick}
          variant="default"
          className="min-w-[120px]"
        >
          {action.label}
        </Button>
      )}
      
      {children}
    </div>
  );
}