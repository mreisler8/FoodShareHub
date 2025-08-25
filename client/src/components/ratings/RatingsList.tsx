import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, MapPin, Clock, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RatingsListProps {
  userId?: number;
  restaurantId?: number;
  circleId?: number;
  limit?: number;
  showActions?: boolean;
  className?: string;
}

export default function RatingsList({ 
  userId, 
  restaurantId, 
  circleId, 
  limit = 20,
  showActions = false,
  className 
}: RatingsListProps) {
  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['/api/ratings', { userId, restaurantId, circleId, limit }],
    queryFn: async () => {
      let url = '/api/ratings';
      const params = new URLSearchParams();
      
      if (restaurantId) params.set('restaurantId', restaurantId.toString());
      if (circleId) url = `/api/ratings/circle/${circleId}`;
      if (limit) params.set('limit', limit.toString());
      
      const queryString = params.toString();
      return fetch(`${url}${queryString ? `?${queryString}` : ''}`).then(res => res.json());
    }
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300"
            )}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No ratings yet</p>
        <p className="text-sm text-gray-400">
          {circleId 
            ? "No ratings have been shared with this circle"
            : "Start rating restaurants to build your taste profile"
          }
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {ratings.map((rating: any) => (
        <Card key={rating.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-gray-900">
                  {rating.restaurantName}
                </h3>
                {renderStars(rating.ratingValue)}
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                {!rating.isPrivate && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {rating.sharedWithCircle ? 'Circle' : 'Public'}
                  </Badge>
                )}
              </div>
            </div>

            {showActions && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {rating.note && (
            <p className="text-gray-700 mb-3 text-sm leading-relaxed">
              {rating.note}
            </p>
          )}

          {rating.tags && rating.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {rating.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {rating.updatedAt !== rating.createdAt && (
            <p className="text-xs text-gray-400">
              Updated {formatDistanceToNow(new Date(rating.updatedAt), { addSuffix: true })}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}