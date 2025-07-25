import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Star,
  Heart,
  MessageCircle,
  MapPin,
  Users,
  ExternalLink,
  BookOpen,
  ChefHat,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DiscoverItem {
  id: string;
  type: 'list' | 'rating' | 'post' | 'restaurant';
  content: any;
  score: number;
  metadata: {
    author?: {
      id: string;
      name: string;
      avatar?: string;
    };
    createdAt?: string;
    socialProof?: string;
    circleScore?: number;
  };
}

export default function DiscoverItemRenderer({ item }: { item: DiscoverItem }) {
  switch (item.type) {
    case 'list':
      return <ListItemRenderer item={item} />;
    case 'rating':
      return <RatingItemRenderer item={item} />;
    case 'post':
      return <PostItemRenderer item={item} />;
    case 'restaurant':
      return <RestaurantItemRenderer item={item} />;
    default:
      return <DefaultItemRenderer item={item} />;
  }
}

// List Item Renderer
function ListItemRenderer({ item }: { item: DiscoverItem }) {
  const { content, metadata } = item;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header with author info */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {metadata.author?.avatar && (
              <img
                src={metadata.author.avatar}
                alt={metadata.author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">
                {content.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>by {metadata.author?.name}</span>
                {metadata.createdAt && (
                  <>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(metadata.createdAt))} ago</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
            <BookOpen className="h-3 w-3" />
            <span>List</span>
          </div>
        </div>

        {/* Content */}
        {content.description && (
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {content.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{content.itemCount} restaurants</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{content.savedCount} saves</span>
            </div>
          </div>
          
          <Button size="sm" variant="outline" className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            View List
          </Button>
        </div>

        {/* Social proof and Circle Score */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          {metadata.socialProof && (
            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              {metadata.socialProof}
            </div>
          )}
          {metadata.circleScore && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Circle Score: {metadata.circleScore}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Rating Item Renderer
function RatingItemRenderer({ item }: { item: DiscoverItem }) {
  const { content, metadata } = item;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {metadata.author?.avatar && (
              <img
                src={metadata.author.avatar}
                alt={metadata.author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                {content.restaurantName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Rated by {metadata.author?.name}</span>
                {metadata.createdAt && (
                  <>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(metadata.createdAt))} ago</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">
            <Star className="h-3 w-3" />
            <span>Rating</span>
          </div>
        </div>

        {/* Rating display */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < content.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                )}
              />
            ))}
          </div>
          <span className="font-semibold text-gray-900">{content.rating}/5</span>
        </div>

        {/* Notes */}
        {content.notes && (
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {content.notes}
          </p>
        )}

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {content.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {content.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{content.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Social proof and actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {metadata.socialProof && (
            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              {metadata.socialProof}
            </div>
          )}
          <Button size="sm" variant="outline" className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            View Restaurant
          </Button>
        </div>
      </div>
    </div>
  );
}

// Post Item Renderer
function PostItemRenderer({ item }: { item: DiscoverItem }) {
  const { content, metadata } = item;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {metadata.author?.avatar && (
              <img
                src={metadata.author.avatar}
                alt={metadata.author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                {metadata.author?.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>shared an experience</span>
                {metadata.createdAt && (
                  <>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(metadata.createdAt))} ago</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
            <ChefHat className="h-3 w-3" />
            <span>Post</span>
          </div>
        </div>

        {/* Content */}
        {content.content && (
          <p className="text-gray-700 text-sm mb-3 line-clamp-3">
            {content.content}
          </p>
        )}

        {/* Restaurant info if available */}
        {content.restaurantName && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-900">{content.restaurantName}</span>
              {content.location && (
                <span className="text-sm text-gray-600">• {content.location}</span>
              )}
            </div>
          </div>
        )}

        {/* Engagement stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {content.likes !== undefined && (
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{content.likes}</span>
              </div>
            )}
            {content.comments !== undefined && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{content.comments}</span>
              </div>
            )}
          </div>
          
          <Button size="sm" variant="outline" className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            View Post
          </Button>
        </div>
      </div>
    </div>
  );
}

// Restaurant Item Renderer
function RestaurantItemRenderer({ item }: { item: DiscoverItem }) {
  const { content, metadata } = item;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {content.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{content.cuisine}</span>
              <span>•</span>
              <span>{content.location}</span>
              {content.priceRange && (
                <>
                  <span>•</span>
                  <span>{content.priceRange}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
            <MapPin className="h-3 w-3" />
            <span>Restaurant</span>
          </div>
        </div>

        {/* Rating and stats */}
        <div className="flex items-center gap-4 mb-3">
          {content.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="font-medium">{content.rating}</span>
            </div>
          )}
          {metadata.circleScore && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Circle Score: {metadata.circleScore}
            </div>
          )}
        </div>

        {/* Social proof and actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {metadata.socialProof && (
            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              {metadata.socialProof}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              Rate
            </Button>
            <Button size="sm" variant="outline" className="text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default fallback renderer
function DefaultItemRenderer({ item }: { item: DiscoverItem }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600">{item.type[0].toUpperCase()}</span>
        </div>
        <h3 className="font-semibold text-gray-900">{item.type}</h3>
      </div>
      <p className="text-sm text-gray-600">
        Content type: {item.type} • Score: {item.score}
      </p>
    </div>
  );
}