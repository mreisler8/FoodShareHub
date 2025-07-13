import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RestaurantListCard } from "./RestaurantListCard";
import { CreateListModal } from "./CreateListModal";
import { ShareListToCircleModal } from "../circles/ShareListToCircleModal";
import { useState } from "react";
import { Button } from "../Button";
import { Plus, Share2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { RestaurantList } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CircleListsSectionProps {
  circleId: number;
  title?: string;
  showCreateButton?: boolean;
  maxLists?: number;
}

export function CircleListsSection({ 
  circleId, 
  title = "Shared Restaurant Lists", 
  showCreateButton = true,
  maxLists 
}: CircleListsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Fetch circle details to get the name
  const { data: circle } = useQuery({
    queryKey: [`/api/circles/${circleId}`],
    enabled: !!circleId,
  });

  // Fetch lists shared with this circle
  const { data: lists = [], isLoading } = useQuery<RestaurantList[]>({
    queryKey: [`/api/circles/${circleId}/lists`],
    enabled: !!user && !!circleId,
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId: number) => {
      return apiRequest(`/api/lists/${listId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/lists`] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({ title: "List deleted successfully" });
    },
    onError: (error) => {
      console.error("Error deleting list:", error);
      toast({ 
        title: "Failed to delete list", 
        description: "You may not have permission to delete this list",
        variant: "destructive" 
      });
    },
  });

  // Unshare list from circle mutation
  const unshareListMutation = useMutation({
    mutationFn: async (listId: number) => {
      return apiRequest(`/api/lists/${listId}/circles/${circleId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/lists`] });
      toast({ title: "List removed from circle" });
    },
    onError: (error) => {
      console.error("Error unsharing list:", error);
      toast({ 
        title: "Failed to remove list from circle", 
        variant: "destructive" 
      });
    },
  });

  const handleDeleteList = (listId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (confirm("Are you sure you want to delete this list? This action cannot be undone.")) {
      deleteListMutation.mutate(listId);
    }
  };

  const handleUnshareList = (listId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (confirm("Remove this list from the circle?")) {
      unshareListMutation.mutate(listId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayedLists = maxLists ? lists.slice(0, maxLists) : lists;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {showCreateButton && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Share Lists
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create List
            </Button>
          </div>
        )}
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No shared lists yet</h3>
          <p className="text-muted-foreground mb-4">
            Share restaurant lists with this circle or create a new one
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => setIsShareModalOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Share Existing Lists
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create New List
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {displayedLists.map((list) => (
            <div key={list.id} className="relative group">
              <RestaurantListCard list={list} />
              {/* Delete button for list owner */}
              {user && list.createdById === user.id && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleDeleteList(list.id, e)}
                    className="bg-white shadow-md hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
              {/* Unshare button for circle members */}
              {user && list.createdById !== user.id && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleUnshareList(list.id, e)}
                    className="bg-white shadow-md hover:bg-gray-50"
                  >
                    Remove from Circle
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateListModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      <ShareListToCircleModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        circleId={circleId}
        circleName={circle?.name || ""}
      />
    </div>
  );
}