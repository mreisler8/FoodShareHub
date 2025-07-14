import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

interface ShareListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: number;
}

export function ShareListModal({ open, onOpenChange, listId }: ShareListModalProps) {
  const [selectedCircleId, setSelectedCircleId] = useState<string>("");
  const [canEdit, setCanEdit] = useState(false);
  const [canReshare, setCanReshare] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch circles the user is a member of
  const { data: circles, isLoading: circlesLoading } = useQuery({
    queryKey: ["/api/me/circles"],
    queryFn: async () => {
      const res = await apiRequest("/api/me/circles");
      return res.json();
    },
  });

  // Fetch circles the list is already shared with
  const {
    data: sharedWith,
    isLoading: sharedWithLoading,
    refetch: refetchSharedWith,
  } = useQuery({
    queryKey: ["/api/restaurant-lists", listId, "shared-with"],
    queryFn: async () => {
      const res = await apiRequest(`/api/restaurant-lists/${listId}/shared-with`);
      return res.json();
    },
    enabled: !!listId,
  });

  // Mutation to share list with a circle
  const shareListMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCircleId) {
        throw new Error("Please select a circle");
      }
      
      const permissions = canEdit ? "edit" : canReshare ? "reshare" : "view";
      
      const res = await apiRequest("/api/shared-lists", {
        method: "POST",
        body: JSON.stringify({
          listId,
          circleId: parseInt(selectedCircleId),
          permissions,
        }),
      });
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "List shared successfully",
        description: "The list has been shared with the selected circle",
      });
      setSelectedCircleId("");
      setCanEdit(false);
      setCanReshare(false);
      refetchSharedWith();
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to share list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to remove sharing
  const removeShareMutation = useMutation({
    mutationFn: async (circleId: number) => {
      const res = await apiRequest(`/api/restaurant-lists/${listId}/shared-with/${circleId}`, {
        method: "DELETE",
      });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Sharing removed",
        description: "The list is no longer shared with the selected circle",
      });
      refetchSharedWith();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove sharing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter out circles the list is already shared with
  const availableCircles = circles?.filter(
    (circle) => !sharedWith?.some((share) => share.circle.id === circle.id)
  );

  const handleShare = () => {
    shareListMutation.mutate();
  };

  const handleRemoveShare = (circleId: number) => {
    removeShareMutation.mutate(circleId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share List with Circles</DialogTitle>
          <DialogDescription>
            Share this list with your circles for collaborative dining experiences.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="circle">Select a Circle</Label>
              <Select
                value={selectedCircleId}
                onValueChange={setSelectedCircleId}
                disabled={circlesLoading || !availableCircles?.length}
              >
                <SelectTrigger id="circle">
                  <SelectValue placeholder="Select a circle to share with" />
                </SelectTrigger>
                <SelectContent>
                  {availableCircles?.map((circle) => (
                    <SelectItem key={circle.id} value={circle.id.toString()}>
                      {circle.name}
                    </SelectItem>
                  ))}
                  {availableCircles?.length === 0 && (
                    <SelectItem value="none" disabled>
                      No available circles to share with
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="can-edit">Allow Editing</Label>
                <Switch
                  id="can-edit"
                  checked={canEdit}
                  onCheckedChange={setCanEdit}
                  disabled={!selectedCircleId}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="can-reshare">Allow Resharing</Label>
                <Switch
                  id="can-reshare"
                  checked={canReshare}
                  onCheckedChange={setCanReshare}
                  disabled={!selectedCircleId}
                />
              </div>
            </div>
          </div>

          {sharedWith && sharedWith.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">Currently Shared With</h3>
              <div className="space-y-3">
                {sharedWith.map((share) => (
                  <div key={share.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{share.circle.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Permission: {share.permissions || "view"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveShare(share.circle.id)}
                      disabled={removeShareMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={!selectedCircleId || shareListMutation.isPending}
          >
            {shareListMutation.isPending ? "Sharing..." : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}