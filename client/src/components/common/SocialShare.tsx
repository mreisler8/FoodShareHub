import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Share2, Instagram, Twitter, Facebook, Linkedin, Link, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { analytics } from "@/lib/analytics";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  contentId?: number;
  userId?: number;
  variant?: "icon" | "full";
  className?: string;
}

export function SocialShare({ 
  url, 
  title, 
  description = "", 
  image = "",
  contentId,
  userId,
  variant = "icon",
  className = ""
}: SocialShareProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  
  // Use the current URL if none provided
  const shareUrl = url || window.location.href;
  
  const handleShare = async (platform: string) => {
    setIsSharing(true);
    
    try {
      // Track sharing analytics
      if (userId && contentId) {
        analytics.trackSocialShare(userId, contentId, platform);
      }
      
      // Handle native sharing if available
      if (navigator.share && (platform === 'native' || platform === 'mobile')) {
        await navigator.share({
          title,
          text: description,
          url: shareUrl
        });
        
        toast({
          title: "Shared successfully",
          description: "Your content has been shared"
        });
        
        setIsSharing(false);
        return;
      }
      
      // Platform specific sharing
      let shareLink = '';
      
      switch (platform) {
        case 'instagram':
          // Instagram doesn't have a direct share URL, 
          // we'll need to use their API through a Mobile app or Stories sticker
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            // Deep link to Instagram app with image
            shareLink = `instagram://library?AssetPath=${encodeURIComponent(image)}`;
            window.location.href = shareLink;
          } else {
            // On desktop we can only suggest to share manually
            toast({
              title: "Instagram Sharing",
              description: "Instagram sharing works best on mobile devices with the Instagram app installed."
            });
          }
          break;
          
        case 'twitter':
          shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
          window.open(shareLink, '_blank');
          break;
          
        case 'facebook':
          shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
          window.open(shareLink, '_blank');
          break;
          
        case 'linkedin':
          shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
          window.open(shareLink, '_blank');
          break;
          
        case 'copy':
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied to clipboard",
            description: "Share it with your friends!"
          });
          break;
      }
    } catch (error) {
      console.error("Error sharing:", error);
      toast({
        title: "Sharing failed",
        description: "There was an issue sharing this content.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };
  
  // Determine if we can use the native share API
  const canUseNativeShare = !!navigator.share;
  
  if (variant === "icon") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-full p-2 ${className}`}
            disabled={isSharing}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleShare('instagram')}>
            <Instagram className="mr-2 h-4 w-4" />
            Instagram
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('twitter')}>
            <Twitter className="mr-2 h-4 w-4" />
            Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('facebook')}>
            <Facebook className="mr-2 h-4 w-4" />
            Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('linkedin')}>
            <Linkedin className="mr-2 h-4 w-4" />
            LinkedIn
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('copy')}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      {canUseNativeShare && (
        <Button 
          onClick={() => handleShare('native')} 
          className="w-full justify-center"
          disabled={isSharing}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      )}
      
      <div className="flex space-x-2 justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 px-2"
          onClick={() => handleShare('instagram')}
          disabled={isSharing}
        >
          <Instagram className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 px-2"
          onClick={() => handleShare('twitter')}
          disabled={isSharing}
        >
          <Twitter className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 px-2"
          onClick={() => handleShare('facebook')}
          disabled={isSharing}
        >
          <Facebook className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 px-2" 
          onClick={() => handleShare('linkedin')}
          disabled={isSharing}
        >
          <Linkedin className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 px-2"
          onClick={() => handleShare('copy')}
          disabled={isSharing}
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}