import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Search } from "lucide-react";

interface ShareListModalProps {
  circleId: number;
  circleName: string;
  onClose: () => void;
}

interface List {
  id: number;
  name: string;
  description?: string;
  restaurantCount: number;
  isShared?: boolean;
}

export function ShareListModal({ circleId, circleName, onClose }: ShareListModalProps) {
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const { data: myLists = [], isLoading } = useQuery<List[]>({
    queryKey: ['/api/lists'],
    select: (lists) => lists.filter((list: any) => 
      !list.sharedWithCircles?.some((c: any) => c.id === circleId)
    ),
  });

  const handleShare = async () => {
    if (selectedLists.length === 0) {
      toast({
        title: "No lists selected",
        description: "Please select at least one list to share",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      for (const listId of selectedLists) {
        await apiRequest(`/api/lists/${listId}/share`, {
          method: "POST",
          body: JSON.stringify({ circleId }),
        });
      }

      toast({
        title: "Lists shared!",
        description: `${selectedLists.length} list(s) shared with ${circleName}`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share lists. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const toggleList = (listId: number) => {
    setSelectedLists(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Share Lists with {circleName}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : myLists.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No lists available to share</p>
              <p className="text-sm text-gray-500 mt-1">
                Create some restaurant lists first
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {myLists.map((list) => (
                <label
                  key={list.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedLists.includes(list.id)}
                    onCheckedChange={() => toggleList(list.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{list.name}</p>
                    <p className="text-sm text-gray-600">
                      {list.restaurantCount} restaurants
                    </p>
                    {list.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {list.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedLists.length} list(s) selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={isSharing || selectedLists.length === 0}
            >
              {isSharing ? "Sharing..." : "Share Lists"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}