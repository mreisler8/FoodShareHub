
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Heart, HeartOff } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface SaveListButtonProps {
  listId: string | number;
  userId: string | number;
  className?: string;
  initialSaved?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function SaveListButton({ 
  listId, 
  userId, 
  className = "", 
  initialSaved = false,
  variant = "outline",
  size = "sm"
}: SaveListButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if list is already saved
  const { data: savedStatus } = useQuery({
    queryKey: ["saved-list-status", listId, userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/saved-lists/check/${listId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data.isSaved;
        }
        return false;
      } catch (error) {
        console.log('Error checking save status:', error);
        return false;
      }
    },
    enabled: !!listId && !!userId,
  });

  // Update local state when query data changes
  useEffect(() => {
    if (savedStatus !== undefined) {
      setIsSaved(savedStatus);
    }
  }, [savedStatus]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lists/${listId}/save`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save list");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ["saved-lists"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list", listId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["saved-list-status", listId, userId] });
      
      toast({
        title: "List saved!",
        description: data.message || "List has been added to your saved lists.",
      });
    },
    onError: (error: Error) => {
      console.error("Error saving list:", error);
      toast({
        title: "Unable to save list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lists/${listId}/save`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to unsave list");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setIsSaved(false);
      queryClient.invalidateQueries({ queryKey: ["saved-lists"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list", listId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["saved-list-status", listId, userId] });
      
      toast({
        title: "List removed",
        description: data.message || "List has been removed from your saved lists.",
      });
    },
    onError: (error: Error) => {
      console.error("Error unsaving list:", error);
      toast({
        title: "Unable to remove list",
        description: error.message,
        variant: "destructive",
      });
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

  const buttonVariant = isSaved ? "default" : variant;
  const buttonSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "default";

  return (
    <Button
      variant={buttonVariant}
      size={buttonSize}
      onClick={handleToggleSave}
      disabled={isLoading}
      className={`transition-all duration-200 ${className}`}
    >
      {isSaved ? (
        <>
          <BookmarkCheck className="w-4 h-4 mr-2" />
          {isLoading ? "Removing..." : "Saved"}
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
