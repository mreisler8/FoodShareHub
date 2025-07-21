import React from 'react';
import { Star, Clock, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RatingDisplayProps {
  rating: {
    id: number;
    ratingValue: number;
    note?: string;
    tags: string[];
    isPrivate: boolean;
    sharedWithCircle: boolean;
    createdAt: string;
  };
  restaurant: {
    name: string;
    location?: string;
  };
  compact?: boolean;
  showRestaurant?: boolean;
  className?: string;
}

export default function RatingDisplay({ 
  rating, 
  restaurant, 
  compact = false, 
  showRestaurant = false,
  className 
}: RatingDisplayProps) {
  const renderStars = (ratingValue: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={cn(
          compact ? "h-3 w-3" : "h-4 w-4", 
          i < ratingValue ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )} 
      />
    ));
  };

  const getRatingLabel = (value: number) => {
    switch (value) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Great";
      case 5: return "Excellent";
      default: return "";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      if (diffInHours < 1) return "Just now";
      return `${diffInHours}h ago`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex">
          {renderStars(rating.ratingValue)}
        </div>
        <span className="text-sm font-medium">
          {rating.ratingValue}/5
        </span>
        {rating.tags.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {rating.tags[0]}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with restaurant name if needed */}
          {showRestaurant && (
            <div>
              <h4 className="font-medium text-sm">{restaurant.name}</h4>
              {restaurant.location && (
                <p className="text-xs text-muted-foreground">{restaurant.location}</p>
              )}
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex">
              {renderStars(rating.ratingValue)}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">
                {rating.ratingValue}/5
              </span>
              <span className="text-sm text-muted-foreground">
                {getRatingLabel(rating.ratingValue)}
              </span>
            </div>
          </div>

          {/* Note */}
          {rating.note && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                "{rating.note}"
              </p>
            </div>
          )}

          {/* Tags */}
          {rating.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rating.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(rating.createdAt)}
            </div>
            <div>
              {rating.isPrivate ? (
                <Badge variant="outline" className="text-xs">
                  Private
                </Badge>
              ) : rating.sharedWithCircle ? (
                <Badge variant="outline" className="text-xs">
                  Shared with circles
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}