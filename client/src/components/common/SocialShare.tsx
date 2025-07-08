import { useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Instagram, Twitter, Facebook, Linkedin, Copy, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

  const handleShare = useCallback(async (platform: string) => {
    if (isSharing) return; // Prevent double clicks
    
    setIsSharing(true);

    try {
      // Track sharing analytics (non-blocking)
      if (userId && contentId) {
        analytics.trackSocialShare(userId, contentId, platform).catch(console.error);
      }

      // Handle native sharing if available
      if (navigator.share && (platform === 'native' || platform === 'mobile')) {
        try {
          await navigator.share({
            title,
            text: description,
            url: shareUrl
          });

          toast({
            title: "Shared successfully",
            description: "Your content has been shared"
          });
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') {
            throw shareError;
          }
        }
        return;
      }

      // Platform specific sharing with better error handling
      switch (platform) {
        case 'instagram':
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            // Try Instagram deep link first
            const instagramUrl = `instagram://library?AssetPath=${encodeURIComponent(image)}`;
            
            // Fallback to web version if app not installed
            const fallbackTimer = setTimeout(() => {
              window.open('https://www.instagram.com/', '_blank');
            }, 1000);
            
            window.location.href = instagramUrl;
            
            // Clear fallback if Instagram app opened
            setTimeout(() => clearTimeout(fallbackTimer), 500);
          } else {
            // Copy to clipboard and provide instructions
            await navigator.clipboard.writeText(shareUrl);
            toast({
              title: "Link copied for Instagram",
              description: "Paste this link in your Instagram bio or stories. Instagram sharing works best on mobile devices."
            });
          }
          break;

        case 'twitter':
          const twitterText = `${title} ${shareUrl}`;
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
          window.open(twitterUrl, '_blank', 'width=550,height=420');
          break;

        case 'facebook':
          const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&t=${encodeURIComponent(title)}`;
          window.open(facebookUrl, '_blank', 'width=600,height=400');
          break;

        case 'linkedin':
          const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description)}`;
          window.open(linkedinUrl, '_blank', 'width=600,height=400');
          break;

        case 'copy':
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied to clipboard",
            description: "Share it with your friends!"
          });
          break;

        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error: any) {
      console.error("Error sharing:", error);
      toast({
        title: "Sharing failed",
        description: error.message || "There was an issue sharing this content.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  }, [shareUrl, title, description, image, userId, contentId, isSharing, toast]);

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