import { useState } from "react";
import { Button } from "./ui/button";
import { BookmarkPlus, BookmarkCheck, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SaveListButtonProps {
  listId: string;
  userId: string;
}

export function SaveListButton({ listId, userId }: SaveListButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if list is already saved
  const { data: savedLists } = useQuery({
    queryKey: [`/api/users/${userId}/saved-lists`],
    enabled: !!userId,
  });

  // Check if current list is in saved lists
  const isListSaved = savedLists?.some((saved: any) => saved.listId === parseInt(listId));

  // Save/unsave mutation
  const saveListMutation = useMutation({
    mutationFn: async (action: 'save' | 'unsave') => {
      if (action === 'save') {
        return await apiRequest("POST", `/api/lists/${listId}/save`);
      } else {
        return await apiRequest("DELETE", `/api/lists/${listId}/save`);
      }
    },
    onSuccess: (_, action) => {
      setIsSaved(action === 'save');
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/saved-lists`] });
      toast({
        title: action === 'save' ? "List saved!" : "List removed",
        description: action === 'save' 
          ? "This list has been added to your saved collection" 
          : "This list has been removed from your saved collection",
      });
    },
    onError: (error: any) => {
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