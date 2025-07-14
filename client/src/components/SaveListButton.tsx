import { useEffect, useState } from "react";
import { BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SaveListButtonProps {
  listId: number;
  className?: string;
}

export function SaveListButton({ listId, className }: SaveListButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to check if list is saved
  const { data: saveStatus } = useQuery({
    queryKey: ['/api/saved-lists', listId, 'status'],
    queryFn: async () => {
      const response = await apiRequest(`/api/saved-lists/${listId}/status`);
      return response.json();
    },
    enabled: !!listId,
  });

  const isSaved = saveStatus?.isSaved || false;

  // Mutation to toggle save/unsave
  const toggleSaveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        // Unsave the list
        await apiRequest(`/api/saved-lists/${listId}`, {
          method: 'DELETE',
        });
      } else {
        // Save the list
        await apiRequest('/api/saved-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listId }),
        });
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/saved-lists', listId, 'status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-lists'] });
      
      toast({
        title: isSaved ? "List removed" : "List saved",
        description: isSaved
          ? "Removed from your Saved tab."
          : "You can find this in your Saved tab.",
      });
    },
    onError: (error: any) => {
      console.error('Error toggling save status:', error);
      toast({
        title: "Error",
        description: "Failed to save/unsave list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleSave = () => {
    toggleSaveMutation.mutate();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isSaved ? "Unsave this list" : "Save this list"}
      onClick={handleToggleSave}
      disabled={toggleSaveMutation.isPending}
      className={`transition-transform hover:scale-105 ${className}`}
    >
      <BookmarkIcon
        className={`h-6 w-6 ${isSaved ? "text-primary fill-primary" : "text-muted-foreground"}`}
      />
    </Button>
  );
}