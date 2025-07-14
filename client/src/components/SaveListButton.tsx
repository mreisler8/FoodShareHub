
import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface SaveListButtonProps {
  listId: number;
  className?: string;
}

export function SaveListButton({ listId, className }: SaveListButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if list is already saved
  const { data: savedLists } = useQuery<any[]>({
    queryKey: [`/api/users/${user?.id}/saved`],
    enabled: !!user?.id,
  });

  const isSaved = savedLists?.some(saved => saved.listId === listId) || false;

  // Save/unsave mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/lists/${listId}/save`, {
        method,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to save list');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate saved lists query to refresh UI
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/saved`] });
      
      toast({
        title: isSaved ? "List removed" : "List saved",
        description: isSaved 
          ? "Removed from your saved lists" 
          : "Added to your saved lists",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save list. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => saveMutation.mutate()}
      disabled={saveMutation.isPending}
      className={className}
      aria-label={isSaved ? "Remove from saved" : "Save list"}
    >
      <Bookmark 
        className={`h-4 w-4 mr-1 ${isSaved ? 'fill-current' : ''}`} 
      />
      {isSaved ? 'Saved' : 'Save'}
    </Button>
  );
}
