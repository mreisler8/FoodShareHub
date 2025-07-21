import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bookmark, 
  Star, 
  Plus, 
  Share2, 
  Heart,
  MessageCircle,
  Copy,
  ExternalLink,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import QuickRateButton from '@/components/ratings/QuickRateButton';
import { useToast } from '@/hooks/use-toast';

interface Restaurant {
  id?: number;
  googlePlaceId?: string;
  name: string;
  location: string;
  address: string;
}

interface Circle {
  id: number;
  name: string;
  memberCount: number;
  isPublic: boolean;
}

interface RestaurantActionBarProps {
  restaurant: Restaurant;
  userRating?: any;
  isSaved?: boolean;
  onSave?: () => void;
  onAddToList?: () => void;
  className?: string;
  variant?: 'mobile' | 'desktop';
}

export default function RestaurantActionBar({
  restaurant,
  userRating,
  isSaved = false,
  onSave,
  onAddToList,
  className,
  variant = 'mobile'
}: RestaurantActionBarProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showCircleShare, setShowCircleShare] = useState(false);
  const { toast } = useToast();

  // Mock circles data - in real app, fetch from API
  const userCircles: Circle[] = [
    { id: 1, name: "Foodie Friends", memberCount: 12, isPublic: false },
    { id: 2, name: "Toronto Eats", memberCount: 45, isPublic: true },
    { id: 3, name: "Date Night Spots", memberCount: 8, isPublic: false },
  ];

  const handleNativeShare = async () => {
    const shareData = {
      title: restaurant.name,
      text: `Check out ${restaurant.name} in ${restaurant.location}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully",
          description: "Restaurant shared via native share sheet"
        });
      } catch (error) {
        console.log('Native share cancelled or failed');
        fallbackShare();
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    setShowShareDialog(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Restaurant link copied to clipboard"
      });
      setShowShareDialog(false);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleShareToCircle = (circleId: number, circleName: string) => {
    // In real app, make API call to share to circle
    toast({
      title: "Shared to circle",
      description: `Restaurant shared to ${circleName}`
    });
    setShowCircleShare(false);
  };

  if (variant === 'mobile') {
    return (
      <>
        {/* Mobile: Fixed bottom action bar */}
        <div className={cn(
          "fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50",
          "safe-area-inset-bottom", // Handle iPhone home indicator
          className
        )}>
          <div className="flex gap-2 max-w-sm mx-auto">
            <Button 
              variant={isSaved ? "default" : "outline"}
              size="sm" 
              className="flex-1 min-h-[48px]"
              onClick={onSave}
            >
              <Bookmark className={cn("h-4 w-4 mr-2", isSaved && "fill-current")} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
            
            <QuickRateButton
              restaurant={restaurant}
              existingRating={userRating}
              variant="compact"
              className="flex-1"
            />
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 min-h-[48px]"
              onClick={onAddToList}
            >
              <Plus className="h-4 w-4 mr-2" />
              List
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 min-h-[48px]"
              onClick={handleNativeShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        
        {/* Add bottom padding to page content to avoid action bar overlap */}
        <div className="h-20" />
      </>
    );
  }

  // Desktop: Inline action bar
  return (
    <>
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="flex gap-3 justify-center">
            <Button 
              variant={isSaved ? "default" : "outline"}
              onClick={onSave}
            >
              <Bookmark className={cn("h-4 w-4 mr-2", isSaved && "fill-current")} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
            
            <QuickRateButton
              restaurant={restaurant}
              existingRating={userRating}
              variant="default"
            />
            
            <Button variant="outline" onClick={onAddToList}>
              <Plus className="h-4 w-4 mr-2" />
              Add to List
            </Button>
            
            <Button variant="outline" onClick={() => setShowCircleShare(true)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Share to Circle
            </Button>
            
            <Button variant="outline" onClick={handleNativeShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share {restaurant.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                🍽️
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{restaurant.name}</h3>
                <p className="text-sm text-muted-foreground">{restaurant.location}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              
              <Button variant="outline" onClick={() => setShowCircleShare(true)}>
                <Send className="h-4 w-4 mr-2" />
                Share to Circle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Circle Share Dialog */}
      <Dialog open={showCircleShare} onOpenChange={setShowCircleShare}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share to Circle</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {userCircles.map((circle) => (
              <div
                key={circle.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleShareToCircle(circle.id, circle.name)}
              >
                <div className="flex-1">
                  <h3 className="font-medium">{circle.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {circle.memberCount} members • {circle.isPublic ? 'Public' : 'Private'}
                  </p>
                </div>
                <Button size="sm" variant="ghost">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {userCircles.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You're not in any circles yet</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Explore Circles
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}