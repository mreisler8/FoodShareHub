import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { RestaurantList } from '@shared/schema';

interface EditListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: RestaurantList;
}

export function EditListModal({ open, onOpenChange, list }: EditListModalProps) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description || '');
  const [shareWithCircle, setShareWithCircle] = useState(list.shareWithCircle || false);
  const [makePublic, setMakePublic] = useState(list.makePublic || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateListMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; shareWithCircle: boolean; makePublic: boolean }) => {
      return apiRequest('PUT', `/api/lists/${list.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "List updated",
        description: "Your list settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${list.id}`] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateListMutation.mutate({
      name,
      description,
      shareWithCircle,
      makePublic,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit List Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">List Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter list name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium">Sharing Options</Label>
            
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