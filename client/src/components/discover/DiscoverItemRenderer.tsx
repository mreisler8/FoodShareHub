import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Star, 
  MapPin,
  Clock,
  Users,
  FileText,
  UtensilsCrossed,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
// import CircleScoreCard from '@/components/circle-score/CircleScoreCard';
import { cn } from '@/lib/utils';

interface DiscoverItem {
  id: string;
  type: "list" | "rating" | "post" | "restaurant";
  content: any;
  score: number;
  metadata: {
    author: { id: string; name: string; avatar?: string };
    createdAt: string;
    socialProof?: string;
    circleScore?: number;
    location?: { lat: number; lng: number };
  };
}

interface DiscoverItemRendererProps {
  item: DiscoverItem;
  className?: string;
}

export default function DiscoverItemRenderer({ item, className }: DiscoverItemRendererProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'list': return <BookOpen className="w-4 h-4" />;
      case 'rating': return <Star className="w-4 h-4" />;
      case 'post': return <FileText className="w-4 h-4" />;
      case 'restaurant': return <UtensilsCrossed className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'list': return 'List';
      case 'rating': return 'Rating';
      case 'post': return 'Post';
      case 'restaurant': return 'Restaurant';
      default: return 'Content';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'list': return 'bg-blue-100 text-blue-700';
      case 'rating': return 'bg-yellow-100 text-yellow-700';
      case 'post': return 'bg-green-100 text-green-700';
      case 'restaurant': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <Card className={cn("rounded-xl shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        {/* Header with author info and type badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={item.metadata.author.avatar} />
              <AvatarFallback>
                {item.metadata.author.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">{item.metadata.author.name}</span>
                <Badge variant="secondary" className={cn("text-xs", getTypeColor(item.type))}>
                  {getTypeIcon(item.type)}
                  <span className="ml-1">{getTypeLabel(item.type)}</span>
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(item.metadata.createdAt)}</span>
                {item.metadata.location && (
                  <>
                    <span>•</span>
                    <MapPin className="w-3 h-3" />
                    <span>Nearby</span>
                  </>
                )}
              </div>
              {item.metadata.socialProof && (
                <div className="text-xs text-blue-600 mt-1">
                  {item.metadata.socialProof}
                </div>
              )}
            </div>
          </div>
          
          {/* Score indicator */}
          <div className="text-right">
            <div className="text-xs text-gray-500">Score</div>
            <div className="text-sm font-medium">{item.score.toFixed(0)}</div>
          </div>
        </div>

        {/* Content based on type */}
        {item.type === 'list' && <ListContent item={item} />}
        {item.type === 'rating' && <RatingContent item={item} />}
        {item.type === 'post' && <PostContent item={item} />}
        {item.type === 'restaurant' && <RestaurantContent item={item} />}

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600">
              <Heart className="w-4 h-4 mr-1" />
              <span className="text-xs">Save</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
              <ExternalLink className="w-4 h-4 mr-1" />
              <span className="text-xs">View</span>
            </Button>
          </div>
          
          {/* Circle Score if available */}
          {item.metadata.circleScore && (
            <div className="text-xs text-blue-600">
              Circle Score: {item.metadata.circleScore}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// List content component
function ListContent({ item }: { item: DiscoverItem }) {
  const { content } = item;
  
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-lg">{content.name}</h3>
        {content.description && (
          <p className="text-gray-600 text-sm mt-1">{content.description}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        <div className="flex items-center space-x-1">
          <UtensilsCrossed className="w-4 h-4" />
          <span>{content.itemCount} places</span>
        </div>
        <div className="flex items-center space-x-1">
          <Bookmark className="w-4 h-4" />
          <span>{content.savedCount} saves</span>
        </div>
      </div>
    </div>
  );
}

// Rating content component
function RatingContent({ item }: { item: DiscoverItem }) {
  const { content } = item;
  
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-lg">{content.restaurant?.name}</h3>
        <div className="flex items-center space-x-2 mt-1">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "w-4 h-4",
                  star <= content.rating
                    ? "text-yellow-400 fill-current"
                    : "text-gray-300"
                )}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">{content.rating}/5</span>
        </div>
      </div>
      
      {content.notes && (
        <p className="text-gray-700 text-sm">{content.notes}</p>
      )}
      
      {content.tags && content.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {content.tags.slice(0, 3).map((tag: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {content.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{content.tags.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Post content component
function PostContent({ item }: { item: DiscoverItem }) {
  const { content } = item;
  
  return (
    <div className="space-y-3">
      {content.restaurant && (
        <div className="text-sm text-gray-600">
          at <span className="font-medium">{content.restaurant.name}</span>
        </div>
      )}
      
      {content.content && (
        <p className="text-gray-700">{content.content}</p>
      )}
      
      {content.images && content.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {content.images.slice(0, 4).map((image: string, index: number) => (
            <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={image} 
                alt="Post content" 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        {content.likesCount > 0 && (
          <div className="flex items-center space-x-1">
            <Heart className="w-4 h-4" />
            <span>{content.likesCount}</span>
          </div>
        )}
        {content.commentsCount > 0 && (
          <div className="flex items-center space-x-1">
            <MessageCircle className="w-4 h-4" />
            <span>{content.commentsCount}</span>
          </div>
        )}
        {content.rating && (
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <span>{content.rating}/5</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Restaurant content component
function RestaurantContent({ item }: { item: DiscoverItem }) {
  const { content } = item;
  
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-lg">{content.name}</h3>
        <div className="text-sm text-gray-600 mt-1">
          {content.cuisine && <span>{content.cuisine}</span>}
          {content.priceRange && (
            <>
              {content.cuisine && <span> • </span>}
              <span>{content.priceRange}</span>
            </>
          )}
        </div>
        {content.address && (
          <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
            <MapPin className="w-3 h-3" />
            <span>{content.address}</span>
          </div>
        )}
      </div>
      
      {content.avgRating && (
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "w-4 h-4",
                  star <= Math.round(content.avgRating)
                    ? "text-yellow-400 fill-current"
                    : "text-gray-300"
                )}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {content.avgRating.toFixed(1)} ({content.reviewCount} reviews)
          </span>
        </div>
      )}
    </div>
  );
}