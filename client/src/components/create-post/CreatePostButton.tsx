import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export function CreatePostButton() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleCreatePost = () => {
    try {
      setLocation('/create-post');
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: "Navigation Error",
        description: "Unable to navigate to create post. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleCreatePost}
      className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
    >
      <Plus className="h-4 w-4" />
      Share Experience
    </Button>
  );
}