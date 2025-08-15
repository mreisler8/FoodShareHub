import { useState } from "react";
import { Button } from "./ui/button";
import { BookmarkPlus, BookmarkCheck, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryKeys, useListCacheHelpers } from "@/lib/queryKeys";

interface SaveListButtonProps {
  listId: string;
  userId: string;
}

export function SaveListButton({ listId, userId }: SaveListButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { invalidateSaveStatus, invalidateList } = useListCacheHelpers();
  const listIdNum = parseInt(listId);

  // Use V2 query key and save-status endpoint
  const { data: saveStatus } = useQuery({
    queryKey: queryKeys.saveStatus(listIdNum),
    queryFn: async () => {
      const response = await fetch(`/api/lists/${listId}/save-status`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to check save status');
      }
      return response.json();
    },
    enabled: !!userId && !isNaN(listIdNum),
  });

  const isListSaved = saveStatus?.saved || false;

  // Save/unsave mutation with optimistic updates
  const saveListMutation = useMutation({
    mutationFn: async (action: 'save' | 'unsave') => {
      return await apiRequest(`/api/lists/${listId}/save`, {
        method: action === 'save' ? 'POST' : 'DELETE',
      });
    },
    onMutate: async (action) => {
      // Optimistic update using V2 query key
      await queryClient.cancelQueries({ queryKey: queryKeys.saveStatus(listIdNum) });
      
      const previousSaveStatus = queryClient.getQueryData(queryKeys.saveStatus(listIdNum));
      
      queryClient.setQueryData(queryKeys.saveStatus(listIdNum), { 
        saved: action === 'save' 
      });

      return { previousSaveStatus };
    },
    onSuccess: (_, action) => {
      // Use centralized invalidation helpers
      invalidateSaveStatus(listIdNum, parseInt(userId));
      invalidateList(listIdNum);
      
      toast({
        title: action === 'save' ? "List saved!" : "List removed",
        description: action === 'save' 
          ? "This list has been added to your saved collection" 
          : "This list has been removed from your saved collection",
      });
    },
    onError: (error: any, action, context) => {
      // Rollback optimistic update
      if (context?.previousSaveStatus) {
        queryClient.setQueryData(queryKeys.saveStatus(listIdNum), context.previousSaveStatus);
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to update saved list",
        variant: "destructive",
      });
    },
  });

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const action = isListSaved ? 'unsave' : 'save';
    saveListMutation.mutate(action);
  };

  return (
    <Button
      variant={isListSaved ? "default" : "outline"}
      size="sm"
      onClick={handleSaveClick}
      disabled={saveListMutation.isPending}
      aria-pressed={isListSaved}
      aria-label={`${isListSaved ? 'Remove' : 'Save'} list ${isListSaved ? 'from' : 'to'} your collection`}
      className="flex items-center gap-2"
    >
      {saveListMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isListSaved ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <BookmarkPlus className="h-4 w-4" />
      )}
      {isListSaved ? "Saved" : "Save"}
    </Button>
  );
}