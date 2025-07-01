import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyIcon, Mail, Users, UserPlus, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SocialShare } from "@/components/common/SocialShare";
import { analytics } from "@/lib/analytics";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId?: number;
  circleName?: string;
  onSuccess?: () => void;
  userId: number;
}

export function InviteModal({ 
  open, 
  onOpenChange, 
  circleId, 
  circleName,
  onSuccess,
  userId
}: InviteModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [inviteType, setInviteType] = useState<"app" | "circle">("app");
  const [emailSent, setEmailSent] = useState(false);
  
  // Generate a unique referral link that includes the user ID and optional circle ID
  const referralLink = circleId 
    ? `${window.location.origin}/join?ref=${userId}&circle=${circleId}` 
    : `${window.location.origin}/join?ref=${userId}`;
  
  // Invite via email mutation
  const inviteEmailMutation = useMutation({
    mutationFn: async () => {
      const endpoint = inviteType === "circle" 
        ? "/api/invites/circle" 
        : "/api/invites/app";
        
      return await apiRequest("POST", endpoint, {
        email,
        userId,
        ...(circleId && { circleId })
      });
    },
    onSuccess: () => {
      setEmailSent(true);
      setEmail("");
      analytics.trackInvite(userId, inviteType, "email", circleId);
      
      toast({
        title: "Invitation sent!",
        description: `Your invitation has been sent to ${email}`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to send invitation",
        description: "Please check the email address and try again.",
        variant: "destructive"
      });
    }
  });
  
  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      analytics.trackInvite(userId, inviteType, "link", circleId);
      
      toast({
        title: "Link copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again or select the link manually",
        variant: "destructive"
      });
    }
  };
  
  // Handle email invite submission
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      inviteEmailMutation.mutate();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {inviteType === "circle" 
              ? `Invite to ${circleName || "your Circle"}` 
              : "Share with friends"}
          </DialogTitle>
          <DialogDescription>
            {inviteType === "circle"
              ? "Invite friends to join your trusted Circle for restaurant recommendations"
              : "Invite friends to join Circles and discover restaurants through trusted connections"}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="link">Copy Link</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>
          
          {/* Copy Link Tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                value={referralLink}
                readOnly
                className="flex-1"
              />
              <Button size="icon" onClick={handleCopyLink}>
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant={inviteType === "app" ? "default" : "outline"} 
                onClick={() => setInviteType("app")}
                className="flex-1"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                App Invite
              </Button>
              
              {circleId && (
                <Button 
                  variant={inviteType === "circle" ? "default" : "outline"}
                  onClick={() => setInviteType("circle")}
                  className="flex-1"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Circle Invite
                </Button>
              )}
            </div>
          </TabsContent>
          
          {/* Email Tab */}
          <TabsContent value="email">
            {emailSent ? (
              <div className="text-center py-4">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-2" />
                <h3 className="text-lg font-medium">Invitation Sent!</h3>
                <p className="text-neutral-500 mb-4">
                  We've sent an invitation to join {inviteType === "circle" ? circleName || "your circle" : "TasteBuds"}
                </p>
                <Button onClick={() => setEmailSent(false)}>
                  Send Another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  
                  <div className="flex space-x-2">
                    <Button
                      variant={inviteType === "app" ? "default" : "outline"} 
                      onClick={() => setInviteType("app")}
                      type="button"
                      className="flex-1"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      App Invite
                    </Button>
                    
                    {circleId && (
                      <Button 
                        variant={inviteType === "circle" ? "default" : "outline"}
                        onClick={() => setInviteType("circle")}
                        type="button"
                        className="flex-1"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Circle Invite
                      </Button>
                    )}
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!email.trim() || inviteEmailMutation.isPending}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </Button>
              </form>
            )}
          </TabsContent>
          
          {/* Social Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="mb-4">
              <p className="text-sm text-neutral-600 mb-2">
                Share TasteBuds with your social network
              </p>
              
              <div className="flex space-x-2 mb-4">
                <Button
                  variant={inviteType === "app" ? "default" : "outline"} 
                  onClick={() => setInviteType("app")}
                  className="flex-1"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  App Invite
                </Button>
                
                {circleId && (
                  <Button 
                    variant={inviteType === "circle" ? "default" : "outline"}
                    onClick={() => setInviteType("circle")}
                    className="flex-1"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Circle Invite
                  </Button>
                )}
              </div>
            </div>
            
            <SocialShare
              url={referralLink}
              title={inviteType === "circle" 
                ? `Join my Circle "${circleName}" on TasteBuds` 
                : "Join me on TasteBuds for trusted restaurant recommendations"}
              description="Restaurant recommendations from people you trust, not strangers on the internet."
              variant="full"
              userId={userId}
              contentId={circleId}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <div className="text-xs text-neutral-500 mt-2 sm:mt-0">
            {inviteType === "circle" ? "Circle members can view your shared recommendations" : ""}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}