import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UtensilsCrossed, 
  FileText, 
  MapPin, 
  User, 
  Star, 
  UserPlus, 
  UserCheck,
  Clock
} from 'lucide-react';
import { SearchResult } from '@/services/searchService';
import { cn } from '@/lib/utils';
import { FollowButton } from '@/components/FollowButton';

interface SearchResultsListProps {
  results: SearchResult[];
  isLoading?: boolean;
  error?: Error | null;
  emptyMessage?: string;
  onResultClick?: (result: SearchResult) => void;
  onFollowToggle?: (userId: string, isFollowing?: boolean) => void;
  showFollowButton?: boolean;
  highlightedIndex?: number;
  className?: string;
}

export function SearchResultsList({
  results,
  isLoading = false,
  error,
  emptyMessage = "No results found",
  onResultClick,
  onFollowToggle,
  showFollowButton = false,
  highlightedIndex = -1,
  className
}: SearchResultsListProps) {
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return <UtensilsCrossed className="h-4 w-4 text-primary" />;
      case 'list': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'post': return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'user': return <User className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={cn(
          "h-3 w-3", 
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )} 
      />
    ));
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-red-500 text-sm">
          {error.message || "Search failed"}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {results.map((result, index) => (
        <Card 
          key={result.id}
          className={cn(
            "cursor-pointer hover:bg-accent transition-colors",
            highlightedIndex === index && "bg-accent"
          )}
          onClick={() => onResultClick?.(result)}
        >
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              {/* Avatar/Icon */}
              <div className="flex-shrink-0">
                {result.type === 'user' ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={result.profilePicture || result.avatar} />
                    <AvatarFallback>
                      {result.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : result.thumbnailUrl ? (
                  <img 
                    src={result.thumbnailUrl} 
                    alt={result.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    {getResultIcon(result.type)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {result.name}
                    </h3>
                    
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    )}
                    
                    {result.type === 'user' && result.username && (
                      <p className="text-xs text-muted-foreground">
                        @{result.username}
                      </p>
                    )}
                    
                    {result.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {result.location}
                      </p>
                    )}
                    
                    {result.avgRating && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex">
                          {renderStars(Math.round(typeof result.avgRating === 'number' ? result.avgRating : 4.0))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {typeof result.avgRating === 'number' ? result.avgRating.toFixed(1) : '4.0'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2">
                    {result.tags && result.tags.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {result.tags[0]}
                      </Badge>
                    )}
                    
                    {result.priceRange && (
                      <Badge variant="outline" className="text-xs">
                        {result.priceRange}
                      </Badge>
                    )}
                    
                    {showFollowButton && result.type === 'user' && (
                      <FollowButton
                        userId={parseInt(result.id)}
                        isFollowing={result.isFollowing || false}
                        size="sm"
                        className="h-7 px-2"
                        onFollowChange={(isFollowing) => {
                          onFollowToggle?.(result.id, isFollowing);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}