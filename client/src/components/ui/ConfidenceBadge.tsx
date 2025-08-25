import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConfidenceBadgeProps {
  confidence: 'low' | 'moderate' | 'high';
  contributorCount?: number;
  className?: string;
}

const confidenceConfig = {
  low: {
    label: 'Low Confidence',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Limited data available. Based on few ratings or recent activity.',
    icon: '⚠️'
  },
  moderate: {
    label: 'Moderate',
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    description: 'Good amount of data from your trusted network. Reliable recommendation.',
    icon: '👍'
  },
  high: {
    label: 'High Confidence',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Excellent data from multiple trusted sources. Very reliable recommendation.',
    icon: '✨'
  }
};

export function ConfidenceBadge({ confidence, contributorCount, className = '' }: ConfidenceBadgeProps) {
  const config = confidenceConfig[confidence];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${config.color} ${className} flex items-center gap-1 text-xs font-medium`}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
            {contributorCount && (
              <span className="text-xs opacity-75">({contributorCount})</span>
            )}
            <Info className="h-3 w-3 ml-1 opacity-60" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{config.description}</p>
          {contributorCount && (
            <p className="text-xs mt-1 opacity-75">
              Based on {contributorCount} contributor{contributorCount !== 1 ? 's' : ''} from your network
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ConfidenceBadge;