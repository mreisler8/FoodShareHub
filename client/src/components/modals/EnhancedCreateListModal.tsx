import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { AddListItemModal } from '@/components/lists/AddListItemModal';
import { ListItemPreview } from '@/components/lists/ListItemPreview';
import { ShareDestinationCards } from '@/components/lists/ShareDestinationCards';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ListItemData } from '@/components/lists/AddListItemModal';

interface EnhancedCreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ListFormData {
  title: string;
  description?: string;
  coverImage?: string;
  isRanked: boolean;
  tags: string[];
}

interface ListItem extends ListItemData {
  id: string;
  rank?: number;
}

export interface ShareDestination {
  type: "profile" | "circle" | "public" | "private";
  circleId?: number;
  circleName?: string;
}

const QUICK_TEMPLATES = [
  { text: "Best Pizza Places", tags: ["pizza", "casual"] },
  { text: "Date Night Favorites", tags: ["romantic", "date-night"] },
  { text: "Hidden Gems", tags: ["hidden-gem", "local"] },
  { text: "Brunch Spots", tags: ["brunch", "weekend"] },
  { text: "Budget Eats", tags: ["cheap-eats", "value"] },
  { text: "Must Try Places", tags: ["must-try", "popular"] }
];

const COMMON_TAGS = [
  "casual", "fine-dining", "date-night", "family-friendly", "brunch", 
  "lunch", "dinner", "cheap-eats", "hidden-gem", "popular", "must-try"
];

export function EnhancedCreateListModal({ isOpen, onClose }: EnhancedCreateListModalProps) {
  const { toast } = useToast();
  
  // Form state
  const [listData, setListData] = useState<ListFormData>({
    title: "",
    description: "",
    coverImage: "",
    isRanked: false,
    tags: [],
  });
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [shareDestination, setShareDestination] = useState<ShareDestination>({ type: "private" });
  
  // UI state
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    if (isOpen) {
      const draftData = {
        listData,
        listItems,
        shareDestination,
        timestamp: Date.now()
      };
      localStorage.setItem('list-creation-draft', JSON.stringify(draftData));
    }
  }, [listData, listItems, shareDestination, isOpen]);

  // Load draft on open
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('list-creation-draft');
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          const isRecent = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000; // 24 hours
          if (isRecent && (draft.listData.title || draft.listItems.length > 0)) {
            setListData(draft.listData);
            setListItems(draft.listItems);
            setShareDestination(draft.shareDestination);
          }
        } catch (e) {
          // Invalid draft data
        }
      }
    }
  }, [isOpen]);

  const createListMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('API Request payload:', data);
      return await apiRequest("/api/lists", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result) => {
      console.log('List creation successful:', result);
      localStorage.removeItem('list-creation-draft');
      toast({
        title: "Success!",
        description: "Your list has been created successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      console.error('List creation error:', error);
      
      // Extract specific error message if available
      let errorMessage = "Failed to create list. Please try again.";
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (template: typeof QUICK_TEMPLATES[0]) => {
    setListData(prev => ({
      ...prev,
      title: template.text,
      description: `My curated list of ${template.text.toLowerCase()}`,
      tags: [...Array.from(new Set([...prev.tags, ...template.tags]))]
    }));
  };

  const handleTagAdd = (tag: string) => {
    if (!listData.tags.includes(tag)) {
      setListData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setListData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddItem = (itemData: ListItemData) => {
    const newItem: ListItem = {
      ...itemData,
      id: Date.now().toString(),
      rank: listData.isRanked ? listItems.length + 1 : undefined
    };
    setListItems(prev => [...prev, newItem]);
    setShowAddItemModal(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setListItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = () => {
    if (!listData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your list.",
        variant: "destructive",
      });
      return;
    }

    if (listItems.length === 0) {
      toast({
        title: "Add items",
        description: "Please add at least one restaurant to your list.",
        variant: "destructive",
      });
      return;
    }

    // Transform shareDestination to visibilityV2 format expected by backend
    let visibilityV2: 'private' | 'public' | 'followers' | 'circle' = 'private';
    let visibilityCircleIds: number[] | null = null;

    switch (shareDestination.type) {
      case 'profile':
        visibilityV2 = 'followers';
        break;
      case 'public':
        visibilityV2 = 'public';
        break;
      case 'circle':
        visibilityV2 = 'circle';
        visibilityCircleIds = shareDestination.circleId ? [shareDestination.circleId] : null;
        break;
      default:
        visibilityV2 = 'private';
    }

    // Transform data to match backend schema
    const submissionData = {
      name: listData.title,  // Backend expects 'name' not 'title'
      description: listData.description || null,
      tags: listData.tags || [],
      visibilityV2,
      visibilityCircleIds,
      type: 'restaurant' as const,
      coverImage: listData.coverImage || null,
      // Include list items for processing
      items: listItems.map((item, index) => ({
        restaurantId: item.restaurant?.id || null,
        position: listData.isRanked ? index + 1 : null,
        notes: item.notes || null,
        // Transform item data structure
        restaurant: item.restaurant
      }))
    };

    console.log('Submitting list data:', submissionData);
    createListMutation.mutate(submissionData);
  };

  const handleClose = () => {
    setListData({
      title: "",
      description: "",
      coverImage: "",
      isRanked: false,
      tags: [],
    });
    setListItems([]);
    setShareDestination({ type: "private" });
    onClose();
  };

  const isCompleted = listData.title.trim() && listItems.length > 0;

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl w-full h-[95vh] p-0 gap-0 flex flex-col">
          <div className="flex flex-col h-full">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Create New List</h2>
                  <p className="text-sm text-gray-500">Curate your favorite restaurants</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6 space-y-6">
                {/* Quick Templates */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Start Templates</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_TEMPLATES.map((template, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleTemplateSelect(template)}
                        className="h-auto p-3 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{template.text}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* List Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                      List Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Best Pizza in NYC"
                      value={listData.title}
                      onChange={(e) => setListData(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Tell others what makes this list special..."
                      value={listData.description}
                      onChange={(e) => setListData(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ranked"
                      checked={listData.isRanked}
                      onCheckedChange={(checked) => setListData(prev => ({ ...prev, isRanked: checked }))}
                    />
                    <Label htmlFor="ranked" className="text-sm">
                      Ranked list (show order)
                    </Label>
                  </div>

                  {/* Tags */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Tags</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {listData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTagRemove(tag)}
                              className="h-auto p-0 hover:bg-transparent"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {COMMON_TAGS.filter(tag => !listData.tags.includes(tag)).slice(0, 8).map((tag) => (
                          <Button
                            key={tag}
                            variant="outline"
                            size="sm"
                            onClick={() => handleTagAdd(tag)}
                            className="h-6 px-2 text-xs"
                          >
                            + {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* List Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Restaurants ({listItems.length})
                    </Label>
                    <Button
                      onClick={() => setShowAddItemModal(true)}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Restaurant
                    </Button>
                  </div>

                  {listItems.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <p className="text-gray-500 text-sm">No restaurants added yet</p>
                      <Button
                        onClick={() => setShowAddItemModal(true)}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Add your first restaurant
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {listItems.map((item, index) => (
                        <ListItemPreview
                          key={item.id}
                          item={item}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Share Destination */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Share with
                  </Label>
                  <ShareDestinationCards
                    selected={shareDestination}
                    onChange={setShareDestination}
                  />
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCompleted && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">Ready to create</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!isCompleted || createListMutation.isPending}
                  className="gap-2"
                >
                  {createListMutation.isPending ? 'Creating...' : 'Create List'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddListItemModal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        onSave={handleAddItem}
      />
    </>
  );
}