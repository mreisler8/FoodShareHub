import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Share2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface ShareListToCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  circleId: number;
  circleName: string;
}

interface UserList {
  id: number;
  name: string;
  description: string;
  restaurantCount: number;
  isPublic: boolean;
  sharedWithCircles: number[];
}

export function ShareListToCircleModal({ 
  isOpen, 
  onClose, 
  circleId,
  circleName 
}: ShareListToCircleModalProps) {
  const [selectedLists, setSelectedLists] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch user's lists
  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['/api/lists'],
    enabled: isOpen && !!user,
  });

  // Share lists mutation
  const shareMutation = useMutation({
    mutationFn: async (listIds: number[]) => {
      const promises = listIds.map(listId => 
        apiRequest(`/api/circles/${circleId}/lists`, {
          method: 'POST',
          body: JSON.stringify({ 
            listId,
            canEdit: false,
            canReshare: false 
          }),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: 'Lists shared',
        description: `Successfully shared ${selectedLists.size} list(s) with ${circleName}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/lists`] });
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      onClose();
      setSelectedLists(new Set());
    },
    onError: (error: any) => {
      toast({
        title: 'Error sharing lists',
        description: error.message || 'Failed to share lists',
        variant: 'destructive',
      });
    },
  });

  const handleToggleList = (listId: number) => {
    const newSelected = new Set(selectedLists);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setSelectedLists(newSelected);
  };

  const handleShare = () => {
    if (selectedLists.size > 0) {
      shareMutation.mutate(Array.from(selectedLists));
    }
  };

  // Filter out lists already shared with this circle
  const availableLists = lists.filter((list: UserList) => 
    !list.sharedWithCircles?.includes(circleId)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Share Your Lists with {circleName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select the lists you want to share with this circle. Members will be able to view these lists.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : availableLists.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-gray-500">
                {lists.length === 0 
                  ? "You don't have any lists to share yet."
                  : "All your lists are already shared with this circle."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {availableLists.map((list: UserList) => (
                  <Card
                    key={list.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedLists.has(list.id) 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleList(list.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedLists.has(list.id)}
                        onCheckedChange={() => handleToggleList(list.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{list.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{list.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500">
                            {list.restaurantCount} restaurants
                          </span>
                          {list.isPublic && (
                            <Badge variant="secondary" className="text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedLists.has(list.id) && (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {selectedLists.size > 0 && `${selectedLists.size} list(s) selected`}
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleShare}
                disabled={selectedLists.size === 0 || shareMutation.isPending}
              >
                {shareMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}