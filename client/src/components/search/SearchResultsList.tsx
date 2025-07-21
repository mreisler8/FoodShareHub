import React from 'react';
import { useLocation } from 'wouter';
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
import QuickRateButton from '@/components/ratings/QuickRateButton';
import CircleScoreCard from '@/components/circle-score/CircleScoreCard';
import { useCircleScore } from '@/hooks/useCircleScore';

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
  enableDirectNavigation?: boolean;
}

// Circle Score Display Component for Search Results
function CircleScoreDisplay({ restaurantId, googlePlaceId }: { 
  restaurantId?: number; 
  googlePlaceId?: string; 
}) {
  const { data: circleScore } = useCircleScore({ 
    restaurantId, 
    googlePlaceId, 
    enabled: !!(restaurantId || googlePlaceId) 
  });

  if (!circleScore) return null;

  return (
    <CircleScoreCard 
      data={circleScore} 
      variant="compact" 
      className="text-xs"
    />
  );
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
  className,
  enableDirectNavigation = false
}: SearchResultsListProps) {
  const [, setLocation] = useLocation();

  const handleResultClick = (result: SearchResult) => {
    // Direct navigation for restaurants when enabled
    if (enableDirectNavigation && result.type === 'restaurant') {
      if (result.metadata?.googlePlaceId || result.id.toString().startsWith('google_')) {
        const googlePlaceId = result.metadata?.googlePlaceId || result.id.toString().replace('google_', '');
        setLocation(`/restaurants/google/${encodeURIComponent(googlePlaceId)}`);
      } else {
        setLocation(`/restaurants/${result.id}`);
      }
      return;
    }

    // Default behavior - call the provided handler
    onResultClick?.(result);
  };

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
          onClick={() => handleResultClick(result)}
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

                    {result.avgRating && typeof result.avgRating === 'number' && !isNaN(result.avgRating) && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex">
                          {renderStars(Math.round(result.avgRating))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {result.avgRating.toFixed(1)}
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

                    {/* Circle Score for restaurants */}
                    {result.type === 'restaurant' && (
                      <CircleScoreDisplay 
                        restaurantId={typeof result.id === 'string' && result.id.startsWith('google_') ? undefined : Number(result.id)}
                        googlePlaceId={typeof result.id === 'string' && result.id.startsWith('google_') ? result.id.replace('google_', '') : result.metadata?.googlePlaceId}
                      />
                    )}

                    {/* Quick Rate Button for restaurants */}
                    {result.type === 'restaurant' && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <QuickRateButton
                          restaurant={{
                            id: typeof result.id === 'string' && result.id.startsWith('google_') ? undefined : Number(result.id),
                            googlePlaceId: typeof result.id === 'string' && result.id.startsWith('google_') ? result.id.replace('google_', '') : result.metadata?.googlePlaceId,
                            name: result.name,
                            location: result.location || result.subtitle || '',
                            address: result.metadata?.address || result.subtitle || ''
                          }}
                          variant="compact"
                        />
                      </div>
                    )}

                    {showFollowButton && result.type === 'user' && onFollowToggle && (
                      <Button
                        variant={result.isFollowing ? "secondary" : "default"}
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFollowToggle(result.id, result.isFollowing);
                        }}
                      >
                        {result.isFollowing ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
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