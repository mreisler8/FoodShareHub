import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Share2, Link, MessageCircle, Users, Copy, Check } from 'lucide-react';

interface ShareOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  description: string;
  color: string;
}

interface MobileShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: {
    type: 'list' | 'post' | 'moment' | 'restaurant';
    id: string;
    title: string;
    description?: string;
    url?: string;
  };
  onShare?: (method: string) => void;
}

export function MobileShareModal({ open, onOpenChange, content, onShare }: MobileShareModalProps) {
  const { toast } = useToast();
  const [copyMessage, setCopyMessage] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Generate shareable URL
  const shareUrl = content.url || `${window.location.origin}/${content.type}s/${content.id}`;

  // Copy link to clipboard
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with anyone",
      });
      setTimeout(() => setLinkCopied(false), 2000);
      onShare?.('copy_link');
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  // Native share (mobile)
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.description || `Check out this ${content.type} on Circles`,
          url: shareUrl,
        });
        onShare?.('native_share');
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback to copy link
      copyLink();
    }
  };

  // Share to specific platforms
  const shareToMessenger = () => {
    const text = encodeURIComponent(`${content.title} - ${shareUrl}`);
    window.open(`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank');
    onShare?.('messenger');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${content.title}\n${content.description || ''}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onShare?.('whatsapp');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`${content.title} via @CirclesApp`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    onShare?.('twitter');
  };

  // Share with message feature
  const shareWithMessage = () => {
    if (copyMessage.trim()) {
      const fullMessage = `${copyMessage}\n\n${shareUrl}`;
      navigator.clipboard.writeText(fullMessage);
      toast({
        title: "Message copied!",
        description: "Your personalized message is ready to share",
      });
      onShare?.('message_share');
      onOpenChange(false);
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'native',
      label: 'Share',
      icon: Share2,
      action: nativeShare,
      description: 'Use your device\'s share menu',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'copy',
      label: linkCopied ? 'Copied!' : 'Copy Link',
      icon: linkCopied ? Check : Copy,
      action: copyLink,
      description: 'Copy link to clipboard',
      color: linkCopied ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      action: shareToWhatsApp,
      description: 'Share via WhatsApp',
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'messenger',
      label: 'Messenger',
      icon: MessageCircle,
      action: shareToMessenger,
      description: 'Share via Facebook Messenger',
      color: 'bg-purple-100 text-purple-800'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5" />
            Share {content.type}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content preview */}
          <div className="p-3 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-sm mb-1">{content.title}</h4>
            {content.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {content.description}
              </p>
            )}
            <div className="flex items-center gap-1 mt-2">
              <Link className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500 truncate">
                {shareUrl}
              </span>
            </div>
          </div>

          {/* Quick share options */}
          <div className="grid grid-cols-2 gap-2">
            {shareOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Button
                  key={option.id}
                  variant="outline"
                  onClick={option.action}
                  className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-gray-50"
                >
                  <IconComponent className="h-5 w-5" />
                  <div className="text-center">
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Custom message sharing */}
          <div className="space-y-3 pt-2 border-t">
            <h5 className="text-sm font-medium text-gray-900">Share with custom message</h5>
            <Textarea
              placeholder="Add a personal message..."
              value={copyMessage}
              onChange={(e) => setCopyMessage(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <Button
              onClick={shareWithMessage}
              disabled={!copyMessage.trim()}
              className="w-full"
              size="sm"
            >
              Copy Message + Link
            </Button>
          </div>

          {/* Quick actions for mobile */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            {navigator.share && (
              <Button
                onClick={nativeShare}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Share Now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MobileShareModal;