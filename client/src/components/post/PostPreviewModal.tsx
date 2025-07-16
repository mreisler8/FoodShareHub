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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview Your Post
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[calc(90vh-120px)] p-4">
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
        </div>

        <DialogFooter className="gap-2 flex-shrink-0 border-t pt-4">
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