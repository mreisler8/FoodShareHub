import { List, Camera, UtensilsCrossed, MessageSquare } from 'lucide-react';
import { PostType } from './PostTypeSelector';

interface PostTypeIconProps {
  type: PostType | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PostTypeIcon({ type, size = 'md', className = '' }: PostTypeIconProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const iconClass = `${sizeClasses[size]} ${className}`;

  switch (type) {
    case 'list':
      return <List className={iconClass} />;
    case 'moment':
      return <Camera className={iconClass} />;
    case 'dish':
      return <UtensilsCrossed className={iconClass} />;
    default:
      return <MessageSquare className={iconClass} />;
  }
}

export function getPostTypeColor(type: PostType | string): string {
  switch (type) {
    case 'list':
      return 'bg-blue-500';
    case 'moment':
      return 'bg-green-500';
    case 'dish':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

export function getPostTypeLabel(type: PostType | string): string {
  switch (type) {
    case 'list':
      return 'List of Spots';
    case 'moment':
      return 'Food Moment';
    case 'dish':
      return 'Dish Recommendation';
    default:
      return 'Post';
  }
}