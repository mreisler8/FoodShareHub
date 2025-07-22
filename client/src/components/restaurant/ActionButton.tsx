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
  disabled?: boolean;
}

export default function ActionButton({
  icon,
  label,
  active = false,
  primary = false,
  onClick,
  className,
  disabled = false
}: ActionButtonProps) {
  const IconComponent = iconMap[icon] || Bookmark;
  
  return (
    <Button
      variant={primary ? "default" : active ? "secondary" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 text-sm transition-all duration-200",
        primary && "bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105 active:scale-95",
        active && "bg-blue-50 text-blue-700 border-blue-200",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <IconComponent className="h-4 w-4" />
      {label}
    </Button>
  );
}