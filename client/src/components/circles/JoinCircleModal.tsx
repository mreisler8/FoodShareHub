import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, ChefHat, DollarSign, Loader2 } from "lucide-react";

interface JoinCircleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialInviteCode?: string;
}

export function JoinCircleModal({ open, onOpenChange, initialInviteCode = "" }: JoinCircleModalProps) {
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const { toast } = useToast();

  // Preview circle before joining
  const { data: circlePreview, isLoading: isLoadingPreview } = useQuery({
    queryKey: [`/api/circles/invite/${inviteCode}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/circles/invite/${inviteCode}`);
      return res.json();
    },
    enabled: !!inviteCode && inviteCode.length >= 6,
  });

  // Join circle mutation
  const joinCircleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/circles/join/${inviteCode}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/circles/user"] });
      
      toast({
        title: "Welcome to the circle!",
        description: `You've joined ${data.circle.name} successfully.`,
      });
      
      onOpenChange(false);
      setInviteCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join circle",
        description: error.message || "Please check the invite code and try again.",
        variant: "destructive",
      });
    },
  });

  const handleJoin = () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Invite code required",
        description: "Please enter an invite code to join a circle.",
        variant: "destructive",
      });
      return;
    }
    joinCircleMutation.mutate();
  };

  const getPriceRangeDisplay = (priceRange: string) => {
    const ranges = {
      "$": "Budget-friendly",
      "$$": "Moderate",
      "$$$": "Upscale", 
      "$$$$": "Fine dining"
    };
    return ranges[priceRange as keyof typeof ranges] || priceRange;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Circle</DialogTitle>
          <DialogDescription>
            Enter an invite code to join a food community.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="e.g., ABC12345"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="mt-1"
            />
          </div>

          {/* Circle Preview */}
          {inviteCode && inviteCode.length >= 6 && (
            <div className="border rounded-lg p-4 bg-gray-50">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading circle...</span>
                </div>
              ) : circlePreview ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{circlePreview.name}</h3>
                    {circlePreview.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {circlePreview.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {circlePreview.primaryCuisine && (
                      <Badge variant="outline" className="text-xs">
                        <ChefHat className="h-3 w-3 mr-1" />
                        {circlePreview.primaryCuisine}
                      </Badge>
                    )}
                    {circlePreview.priceRange && (
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {getPriceRangeDisplay(circlePreview.priceRange)}
                      </Badge>
                    )}
                    {circlePreview.location && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {circlePreview.location}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    {circlePreview.memberCount || 0} members
                  </div>

                  {!circlePreview.allowPublicJoin && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        This circle has restricted joining. You may need special permission.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Invalid invite code</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={!inviteCode.trim() || joinCircleMutation.isPending || !circlePreview}
          >
            {joinCircleMutation.isPending ? "Joining..." : "Join Circle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}