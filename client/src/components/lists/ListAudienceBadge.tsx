
import React from 'react';
import { Badge } from '../ui/badge';
import { Globe, User, Users } from 'lucide-react';

interface ListAudienceBadgeProps {
  audience: string;
  className?: string;
}

export function ListAudienceBadge({ audience, className = '' }: ListAudienceBadgeProps) {
  const getAudienceConfig = () => {
    switch (audience) {
      case 'public':
        return {
          label: 'Public',
          variant: 'default' as const,
          icon: <Globe className="h-3 w-3" />,
          className: 'bg-green-100 text-green-700 border-green-300'
        };
      case 'circle':
        return {
          label: 'Circle',
          variant: 'secondary' as const,
          icon: <Users className="h-3 w-3" />,
          className: 'bg-blue-100 text-blue-700 border-blue-300'
        };
      case 'profile':
      default:
        return {
          label: 'Private',
          variant: 'outline' as const,
          icon: <User className="h-3 w-3" />,
          className: 'bg-gray-100 text-gray-700 border-gray-300'
        };
    }
  };

  const config = getAudienceConfig();

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1 text-xs ${config.className} ${className}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
