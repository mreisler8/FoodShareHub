import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Eye, Plus, Home, Share2 } from "lucide-react";
import { ShareDestination } from "./ShareDestinationCards";

interface PostSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId?: number;
  listTitle: string;
  destination: ShareDestination;
  options: {
    view: string;
    new: string;
    home: string;
  };
  onNavigate: (path: string) => void;
}

export function PostSuccessModal({ 
  open, 
  onOpenChange, 
  listId,
  listTitle, 
  destination, 
  options, 
  onNavigate 
}: PostSuccessModalProps) {
  
  const getDestinationText = () => {
    switch (destination.type) {
      case "public": 
        return "publicly and can be discovered by anyone";
      case "circle": 
        return `with ${destination.circleName || "your circle"}`;
      case "profile": 
        return "on your profile for your followers";
      case "private": 
        return "privately - only you can see it";
      default: 
        return "";
    }
  };

  const handleShare = async () => {
    if (!listId) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: listTitle,
          text: `Check out my list: ${listTitle}`,
          url: `${window.location.origin}/lists/${listId}`,
        });
      } catch (error) {
        // User cancelled sharing or sharing not supported
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    if (!listId) return;
    
    const url = `${window.location.origin}/lists/${listId}`;
    navigator.clipboard.writeText(url).then(() => {
      // Could show a toast here
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            List Published Successfully!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Message */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-medium text-green-900">
                  "{listTitle}" is now live
                </h3>
                <p className="text-sm text-green-700">
                  Your list has been shared {getDestinationText()}.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => onNavigate(options.view)}
              className="w-full h-12 text-base"
            >
              <Eye className="h-5 w-5 mr-2" />
              View Your List
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => onNavigate(options.new)}
                className="h-12"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Another
              </Button>

              {destination.type !== "private" && (
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="h-12"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share List
                </Button>
              )}

              {destination.type === "private" && (
                <Button
                  variant="outline"
                  onClick={() => onNavigate(options.home)}
                  className="h-12"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You can always edit your list later or change sharing settings.
            </p>
            {destination.type === "public" && (
              <p className="text-xs text-muted-foreground">
                Public lists may take a few minutes to appear in search results.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}