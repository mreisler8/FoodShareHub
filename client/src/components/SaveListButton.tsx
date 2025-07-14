import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SaveListButtonProps {
  listId: string | number;
  userId: string | number;
  className?: string;
  initialSaved?: boolean;
}

export function SaveListButton({ 
  listId, 
  userId, 
  className, 
  initialSaved = false 
}: SaveListButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/saved-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ listId: Number(listId) }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save list");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ["saved-lists"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (error) => {
      console.error("Error saving list:", error);
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/saved-lists/${listId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to unsave list");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsSaved(false);
      queryClient.invalidateQueries({ queryKey: ["saved-lists"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (error) => {
      console.error("Error unsaving list:", error);
    },
  });

  const handleToggleSave = () => {
    if (isSaved) {
      unsaveMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  const isLoading = saveMutation.isPending || unsaveMutation.isPending;

  return (
    <Button
      variant={isSaved ? "default" : "outline"}
      size="sm"
      onClick={handleToggleSave}
      disabled={isLoading}
      className={className}
    >
      {isSaved ? (
        <>
          <BookmarkCheck className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Saved"}
        </>
      ) : (
        <>
          <Bookmark className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save List"}
        </>
      )}
    </Button>
  );
}