import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PostTypeIcon, getPostTypeLabel } from './PostTypeIcon';
import { Eye, Send, ArrowLeft, MapPin, Star, Users, Globe, Lock } from 'lucide-react';
import { PostType } from './PostTypeSelector';

interface PostPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  onConfirm: () => void;
}

export function PostPreviewModal({ open, onOpenChange, data, onConfirm }: PostPreviewModalProps) {
  if (!data) return null;

  const handleClose = () => {
    onOpenChange(false);
  };

  const renderPreviewContent = () => {
    switch (data.postType) {
      case 'list':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PostTypeIcon type="list" size="md" />
              <h3 className="text-lg font-semibold">{data.listName}</h3>
            </div>
            
            {data.description && (
              <p className="text-muted-foreground">{data.description}</p>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Restaurants ({data.restaurants?.length || 0})
              </h4>
              
              <div className="grid gap-2">
                {data.restaurants?.slice(0, 3).map((restaurant: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{restaurant.name}</span>
                      {restaurant.location && (
                        <p className="text-sm text-muted-foreground">{restaurant.location}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">#{index + 1}</Badge>
                      {restaurant.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{restaurant.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {data.restaurants?.length > 3 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    And {data.restaurants.length - 3} more restaurants...
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'moment':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PostTypeIcon type="moment" size="md" />
              <h3 className="text-lg font-semibold">Food Moment</h3>
            </div>
            
            {data.restaurant && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{data.restaurant.name}</span>
                {data.restaurant.location && (
                  <span className="text-sm">• {data.restaurant.location}</span>
                )}
              </div>
            )}
            
            {data.rating && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Rating:</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < data.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm">({data.rating}/5)</span>
                </div>
              </div>
            )}
            
            {data.content && (
              <div className="space-y-2">
                <h4 className="font-medium">Your Experience:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{data.content}</p>
              </div>
            )}
            
            {data.images && data.images.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Photos ({data.images.length})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {data.images.slice(0, 4).map((image: string, index: number) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded border">
                      <img 
                        src={image} 
                        alt={`Food moment ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'dish':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PostTypeIcon type="dish" size="md" />
              <h3 className="text-lg font-semibold">Dish Recommendation</h3>
            </div>
            
            {data.dish && (
              <div className="space-y-2">
                <h4 className="font-medium text-primary">{data.dish.name}</h4>
                {data.dish.description && (
                  <p className="text-muted-foreground">{data.dish.description}</p>
                )}
              </div>
            )}
            
            {data.restaurant && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{data.restaurant.name}</span>
                {data.restaurant.location && (
                  <span className="text-sm">• {data.restaurant.location}</span>
                )}
              </div>
            )}
            
            {data.rating && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Rating:</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < data.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm">({data.rating}/5)</span>
                </div>
              </div>
            )}
            
            {data.content && (
              <div className="space-y-2">
                <h4 className="font-medium">Why you recommend it:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{data.content}</p>
              </div>
            )}
          </div>
        );
        
      default:
        return <div>Preview not available</div>;
    }
  };

  const renderVisibilityInfo = () => {
    const { visibility } = data;
    
    if (visibility?.public) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>Public - Anyone can see this post</span>
        </div>
      );
    }
    
    if (visibility?.circleIds?.length > 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Shared with {visibility.circleIds.length} circle(s)</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>Private - Only you can see this</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview Your Post
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Post Type Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="flex items-center gap-2">
              <PostTypeIcon type={data.postType} size="sm" />
              {getPostTypeLabel(data.postType)}
            </Badge>
            
            {renderVisibilityInfo()}
          </div>
          
          {/* Main Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {data.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{data.user?.name || 'You'}</p>
                  <p className="text-sm text-muted-foreground">Just now</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {renderPreviewContent()}
            </CardContent>
          </Card>
          
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Preview:</strong> This is how your post will appear to others. 
              Review the content and visibility settings before publishing.
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Edit Post
          </Button>
          <Button onClick={onConfirm}>
            <Send className="h-4 w-4 mr-2" />
            Publish Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  MapPin,
  Star,
  Hash
} from 'lucide-react';
import { PostTypeIcon, getPostTypeLabel } from './PostTypeIcon';

interface PostPreviewData {
  type: 'moment' | 'list' | 'dish';
  restaurant?: {
    name: string;
    location: string;
  };
  content: string;
  rating?: number;
  images?: string[];
  tags?: string[];
  visibility: 'public' | 'circles' | 'private';
  dishName?: string;
  listName?: string;
  listItems?: Array<{
    name: string;
    rank: number;
  }>;
}

interface PostPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  postData: PostPreviewData;
  userName: string;
  userAvatar?: string;
}

export function PostPreviewModal({
  isOpen,
  onClose,
  postData,
  userName,
  userAvatar
}: PostPreviewModalProps) {
  const renderPostContent = () => {
    switch (postData.type) {
      case 'moment':
        return (
          <div className="space-y-3">
            {postData.images && postData.images.length > 0 && (
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">📸 Photo Preview</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{postData.restaurant?.name}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{postData.restaurant?.location}</span>
            </div>
            {postData.rating && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < postData.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'list':
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{postData.listName}</h3>
            {postData.listItems && (
              <div className="space-y-2">
                {postData.listItems.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {item.rank}
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                ))}
                {postData.listItems.length > 3 && (
                  <p className="text-sm text-gray-500">
                    +{postData.listItems.length - 3} more restaurants
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'dish':
        return (
          <div className="space-y-3">
            <div className="bg-orange-50 p-3 rounded-lg">
              <h3 className="font-semibold text-orange-900">{postData.dishName}</h3>
              <p className="text-sm text-orange-700">at {postData.restaurant?.name}</p>
            </div>
            {postData.rating && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < postData.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            👁️ Preview Your Post
          </DialogTitle>
        </DialogHeader>

        {/* Feed-style preview */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* Post Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback>{userName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{userName}</p>
                  <div className="flex items-center gap-2">
                    <PostTypeIcon type={postData.type} size="sm" />
                    <span className="text-xs text-gray-500">
                      {getPostTypeLabel(postData.type)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {postData.visibility}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Post Content */}
            {renderPostContent()}

            {/* Post Description */}
            <p className="text-sm leading-relaxed">{postData.content}</p>

            {/* Tags */}
            {postData.tags && postData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {postData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Hash className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Engagement Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1 text-gray-500 hover:text-red-500">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">0</span>
                </button>
                <button className="flex items-center gap-1 text-gray-500 hover:text-blue-500">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">0</span>
                </button>
                <button className="flex items-center gap-1 text-gray-500 hover:text-green-500">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
              <button className="text-gray-500 hover:text-yellow-500">
                <Bookmark className="w-5 h-5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Edit Post
          </Button>
          <Button className="flex-1">
            Publish Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
