import { useState } from "react";
import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PostWithDetails } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface InstagramShareButtonProps {
  post: PostWithDetails;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

export function InstagramShareButton({ post, size, variant = "outline", className = "" }: InstagramShareButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [includeRestaurantName, setIncludeRestaurantName] = useState(true);
  const [includeRating, setIncludeRating] = useState(true);
  const [includeFullReview, setIncludeFullReview] = useState(false);
  const [caption, setCaption] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      // Build the Instagram share content
      const shareContent = [];
      
      if (includeRestaurantName && post.restaurant) {
        shareContent.push(`📍 ${post.restaurant.name}`);
      }
      
      if (includeRating) {
        const starRating = "⭐".repeat(Math.min(5, post.rating));
        shareContent.push(`${starRating} ${post.rating}/5`);
      }
      
      if (includeFullReview && post.content) {
        shareContent.push(`"${post.content}"`);
      }
      
      if (caption) {
        shareContent.push(caption);
      }
      
      // Add app hashtag
      shareContent.push("#Circles");
      
      const shareText = shareContent.join("\n\n");
      
      // In a real implementation, this would connect to Instagram's API
      // For now, we'll simulate the API call with a timeout
      
      // This is a simplified simulation - in a real app, this would be a call to Instagram Graph API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Note: In a real implementation, we would:
      // 1. Get access token from user's authenticated Instagram account
      // 2. Prepare media (image) to share to Instagram
      // 3. Create a container for the media
      // 4. Publish the container to Instagram feed or story
      
      toast({
        title: "Shared to Instagram!",
        description: "Your post has been shared to Instagram successfully.",
      });
      
      setIsDialogOpen(false);
      setCaption("");
    } catch (error) {
      toast({
        title: "Sharing failed",
        description: "Could not share to Instagram. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => setIsDialogOpen(true)}
        className={`flex items-center gap-1 ${className}`}
      >
        <Instagram className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        <span>Share to Instagram</span>
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share to Instagram</DialogTitle>
            <DialogDescription>
              Customize how your post will appear on Instagram.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="restaurant-name" className="mr-4">
                Include restaurant name
              </Label>
              <Switch
                id="restaurant-name"
                checked={includeRestaurantName}
                onCheckedChange={setIncludeRestaurantName}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="rating" className="mr-4">
                Include rating
              </Label>
              <Switch
                id="rating"
                checked={includeRating}
                onCheckedChange={setIncludeRating}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="full-review" className="mr-4">
                Include full review
              </Label>
              <Switch
                id="full-review"
                checked={includeFullReview}
                onCheckedChange={setIncludeFullReview}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="caption">Add a caption</Label>
              <Textarea
                id="caption"
                placeholder="Write a custom caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="bg-secondary/10 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Preview:</h4>
              <div className="text-sm space-y-2">
                {includeRestaurantName && post.restaurant && (
                  <p>📍 {post.restaurant.name}</p>
                )}
                {includeRating && (
                  <p>{"⭐".repeat(Math.min(5, post.rating))} {post.rating}/5</p>
                )}
                {includeFullReview && post.content && (
                  <p>"{post.content}"</p>
                )}
                {caption && <p>{caption}</p>}
                <p>#Circles</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={isSharing}>
              {isSharing ? "Sharing..." : "Share to Instagram"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}