import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, Copy, Check, Link, Calendar, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "restaurant" | "list";
  entityId: string | number;
  entityName: string;
}

export function ShareLinkModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName
}: ShareLinkModalProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const generateShareLink = async () => {
    setIsGenerating(true);
    const startTime = Date.now();

    try {
      const response = await apiRequest("/api/sharing/generate-public-link", {
        method: "POST",
        body: JSON.stringify({
          entityType,
          entityId: entityId.toString(),
        }),
      }) as { shareUrl: string; expiresAt: string };

      const responseTime = Date.now() - startTime;
      
      // NFR: Link generation must complete within 1 second
      if (responseTime > 1000) {
        console.warn(`Link generation took ${responseTime}ms, exceeding 1s target`);
      }

      setShareUrl(response.shareUrl);
      setExpiresAt(response.expiresAt);

      toast({
        title: "Share link generated!",
        description: "Your link is ready to share",
      });

    } catch (error: any) {
      console.error("Generate link error:", error);
      
      let errorMessage = "Failed to generate share link. Please try again.";
      if (error.message?.includes("403")) {
        errorMessage = "Only public content can be shared externally.";
      } else if (error.message?.includes("rate limit")) {
        errorMessage = "Too many link generation attempts. Please wait.";
      }

      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      // NFR: Fallback for older browsers (reliability requirement)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);

      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard",
      });

    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const shareViaWebAPI = async () => {
    // NFR: Mobile-optimized touch interactions
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out this ${entityType}`,
          text: `I thought you'd like this ${entityType}: ${entityName}`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", error);
      }
    } else {
      // Fallback to copy
      await copyToClipboard();
    }
  };

  const formatExpirationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Link
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Entity info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 capitalize">{entityType}</p>
                <p className="font-medium">{entityName}</p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Public
              </Badge>
            </div>
          </div>

          {/* Share link generation */}
          {!shareUrl ? (
            <div className="text-center py-6">
              <Link className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-medium mb-2">Generate Share Link</h3>
              <p className="text-sm text-gray-600 mb-4">
                Create a public link that anyone can access for 7 days
              </p>
              <Button
                onClick={generateShareLink}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Generated link */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Share Link</label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 text-sm"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    onClick={copyToClipboard}
                    size="sm"
                    variant="outline"
                    className="px-3"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expiration info - NFR: 7 day expiration */}
              {expiresAt && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Expires</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    {formatExpirationDate(expiresAt)}
                  </p>
                </div>
              )}

              {/* Share actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="w-full"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  onClick={shareViaWebAPI}
                  className="w-full"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}

          {/* Security note */}
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
            <p>• Links expire automatically after 7 days</p>
            <p>• Only public content can be shared externally</p>
            <p>• Anyone with this link can view the {entityType}</p>
          </div>

          {/* Close button */}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}