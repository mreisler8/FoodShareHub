import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, Clock, List, Heart, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contributor {
  userId: number;
  username: string;
  name: string;
  actionType: 'rating' | 'list_placement' | 'reaction' | 'save';
  value: number;
  recency: number; // days ago
}

interface SocialProofAvatarsProps {
  contributors: Contributor[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  expandable?: boolean;
  className?: string;
}

export default function SocialProofAvatars({
  contributors,
  maxVisible = 4,
  size = 'md',
  expandable = true,
  className
}: SocialProofAvatarsProps) {
  const [showAllContributors, setShowAllContributors] = useState(false);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'rating': return <Star className="h-3 w-3" />;
      case 'list_placement': return <List className="h-3 w-3" />;
      case 'reaction': return <Heart className="h-3 w-3" />;
      case 'save': return <Bookmark className="h-3 w-3" />;
      default: return null;
    }
  };

  const getActionDescription = (contributor: Contributor) => {
    switch (contributor.actionType) {
      case 'rating':
        return `Rated ${contributor.value}/5 stars`;
      case 'list_placement':
        return `Added to list (position #${contributor.value})`;
      case 'reaction':
        return 'Reacted to this restaurant';
      case 'save':
        return 'Saved this restaurant';
      default:
        return 'Interacted with this restaurant';
    }
  };

  const formatTimeAgo = (days: number) => {
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const visibleContributors = contributors.slice(0, maxVisible);
  const hiddenCount = Math.max(0, contributors.length - maxVisible);

  if (contributors.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex -space-x-2">
          {visibleContributors.map((contributor) => (
            <TooltipProvider key={contributor.userId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className={cn(
                    sizeClasses[size],
                    "border-2 border-white cursor-help hover:z-10 relative"
                  )}>
                    <AvatarImage src={`/api/users/${contributor.userId}/avatar`} />
                    <AvatarFallback className={textSizeClasses[size]}>
                      {contributor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contributor.name}</span>
                      {getActionIcon(contributor.actionType)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getActionDescription(contributor)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(contributor.recency)}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        
        {hiddenCount > 0 && (
          <>
            {expandable ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllContributors(true)}
                className="text-sm text-muted-foreground hover:text-foreground p-1 h-auto"
              >
                +{hiddenCount} more
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                +{hiddenCount} more
              </span>
            )}
          </>
        )}
      </div>

      {/* Expanded Contributors Modal */}
      {expandable && (
        <Dialog open={showAllContributors} onOpenChange={setShowAllContributors}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>All Contributors ({contributors.length})</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {contributors.map((contributor) => (
                <div key={contributor.userId} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className={sizeClasses['md']}>
                    <AvatarImage src={`/api/users/${contributor.userId}/avatar`} />
                    <AvatarFallback className="text-xs">
                      {contributor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{contributor.name}</span>
                      <span className="text-xs text-muted-foreground">@{contributor.username}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {getActionIcon(contributor.actionType)}
                      <span>{getActionDescription(contributor)}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {formatTimeAgo(contributor.recency)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}