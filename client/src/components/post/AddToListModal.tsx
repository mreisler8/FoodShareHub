import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";
import { CreateListModal } from "@/components/lists/CreateListModal";
import { RestaurantList, PostListItem } from "@shared/schema";
import { Plus, Loader2 } from "lucide-react";

interface AddToListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: number;
}

export function AddToListModal({ open, onOpenChange, postId }: AddToListModalProps) {
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const { toast } = useToast();

  // Fetch user lists
  const { data: userLists = [] } = useQuery<RestaurantList[]>({
    queryKey: ['/api/lists'],
    enabled: open,
  });

  // Fetch current post lists
  const { data: currentPostLists = [] } = useQuery<RestaurantList[]>({
    queryKey: [`/api/posts/${postId}/lists`],
    enabled: open,
  });

  // Initialize selected lists when modal opens
  useState(() => {
    if (open && currentPostLists.length > 0) {
      setSelectedListIds(currentPostLists.map(list => list.id));
    }
  });

  // Update post lists mutation
  const updatePostListsMutation = useMutation({
    mutationFn: async (listIds: number[]) => {
      const response = await apiRequest('POST', `/api/posts/${postId}/lists`, {
        listIds
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/lists`] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      toast({
        title: "Success",
        description: "Post list tags updated successfully!",
      });
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update post lists: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updatePostListsMutation.mutate(selectedListIds);
  };

  const handleCreateListSuccess = (newList: RestaurantList) => {
    queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
    setSelectedListIds([...selectedListIds, newList.id]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Post to Lists</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which lists you'd like to add this post to:
            </p>
            
            <MultiSelect
              options={userLists.map(list => ({ id: list.id, name: list.name }))}
              selected={selectedListIds}
              onChange={setSelectedListIds}
              placeholder="Select lists..."
              emptyMessage="You have no lists"
              emptyAction={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateListOpen(true)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create one now
                </Button>
              }
            />
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updatePostListsMutation.isPending}
                className="flex-1"
              >
                {updatePostListsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Create List Modal */}
      <CreateListModal
        open={isCreateListOpen}
        onOpenChange={setIsCreateListOpen}
        onSuccess={handleCreateListSuccess}
      />
    </>
  );
}