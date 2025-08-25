
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryKeys, useListCacheHelpers } from "@/lib/queryKeys";
import { PrivacySelector } from "@/components/privacy/PrivacySelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RestaurantList } from "@/lib/types";

interface EditListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: RestaurantList;
}

export function EditListModal({ open, onOpenChange, list }: EditListModalProps) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description || "");
  const [visibility, setVisibility] = useState<'public' | 'private' | 'followers' | 'circle'>(
    (list.visibility as 'public' | 'private' | 'followers' | 'circle') || (list.makePublic ? 'public' : 'private')
  );
  const [visibilityCircleIds, setVisibilityCircleIds] = useState<number[]>(
    list.visibilityCircleIds || []
  );
  const [shareWithCircle, setShareWithCircle] = useState(list.shareWithCircle || false);
  const [makePublic, setMakePublic] = useState(list.makePublic || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { invalidateList, invalidateCollections } = useListCacheHelpers();

  // Reset form when list changes
  useEffect(() => {
    setName(list.name);
    setDescription(list.description || "");
    setVisibility((list.visibility as 'public' | 'private' | 'followers' | 'circle') || (list.makePublic ? 'public' : 'private'));
    setVisibilityCircleIds(list.visibilityCircleIds || []);
    setShareWithCircle(list.shareWithCircle || false);
    setMakePublic(list.makePublic || false);
  }, [list]);

  const updateListMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: name.trim(),
        description: description?.trim() || null,
        visibility,
        visibilityCircleIds: visibility === 'circle' ? visibilityCircleIds : null
      };
      
      return await apiRequest(`/api/lists/${list.id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "List updated",
        description: "Your list has been updated successfully.",
      });
      invalidateList(list.id);
      invalidateCollections();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateListMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
          <DialogDescription>
            Update your list details and sharing settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="List name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your list (optional)"
              className="min-h-20"
            />
          </div>

          <div className="space-y-3">
            <Label>Sharing Settings</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shareWithCircle"
                checked={shareWithCircle}
                onCheckedChange={(checked) => setShareWithCircle(checked as boolean)}
              />
              <Label htmlFor="shareWithCircle" className="text-sm">
                Share with Circle
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="makePublic"
                checked={makePublic}
                onCheckedChange={(checked) => setMakePublic(checked as boolean)}
              />
              <Label htmlFor="makePublic" className="text-sm">
                Make Public
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateListMutation.isPending}>
              {updateListMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
