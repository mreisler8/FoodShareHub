import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Bookmark, 
  Zap, 
  Plus, 
  Send, 
  Share2,
  Star,
  LucideIcon 
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  bookmark: Bookmark,
  zap: Zap,
  plus: Plus,
  send: Send,
  'share-2': Share2,
  star: Star,
};

interface ActionButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  primary?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function ActionButton({
  icon,
  label,
  active = false,
  primary = false,
  onClick,
  className
}: ActionButtonProps) {
  const IconComponent = iconMap[icon] || Bookmark;
  
  return (
    <Button
      variant={primary ? "default" : active ? "secondary" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-sm",
        primary && "bg-blue-600 hover:bg-blue-700 text-white",
        active && "bg-blue-50 text-blue-700 border-blue-200",
        className
      )}
    >
      <IconComponent className="h-4 w-4" />
      {label}
    </Button>
  );
}