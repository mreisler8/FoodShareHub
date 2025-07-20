import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { AddListItemModal } from "@/components/lists/AddListItemModal";
import { ListItemPreview } from "@/components/lists/ListItemPreview";
import { ListItemsSortable } from "@/components/lists/ListItemsSortable";
import { ShareDestinationCards } from "@/components/lists/ShareDestinationCards";
import { PostSuccessModal } from "@/components/lists/PostSuccessModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ListItemData } from "@/components/lists/AddListItemModal";

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

export default function CreateListEnhanced() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
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
  const [createdListId, setCreatedListId] = useState<number>();
  
  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string>();

  // Auto-save functionality
  useEffect(() => {
    const saveData = {
      listData,
      listItems,
      shareDestination,
      timestamp: Date.now()
    };
    localStorage.setItem('create-list-draft', JSON.stringify(saveData));
  }, [listData, listItems, shareDestination]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('create-list-draft');
    if (saved) {
      try {
        const { listData: savedListData, listItems: savedItems, shareDestination: savedDestination, timestamp } = JSON.parse(saved);
        // Only restore if less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setListData(savedListData);
          setListItems(savedItems || []);
          setShareDestination(savedDestination || { type: "private" });
        }
      } catch (error) {
        console.error('Failed to restore draft:', error);
      }
    }
  }, []);

  // Handle form changes
  const handleTitleChange = (value: string) => {
    setListData(prev => ({ ...prev, title: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setListData(prev => ({ ...prev, description: value }));
  };

  const handleRankedToggle = (checked: boolean) => {
    setListData(prev => ({ ...prev, isRanked: checked }));
    // Update items with ranks if enabling ranking
    if (checked) {
      const rankedItems = listItems.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
      setListItems(rankedItems);
    }
  };

  // Add Items
  const handleAddItem = (item: ListItemData) => {
    const newItem: ListItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random()}`,
      rank: listData.isRanked ? listItems.length + 1 : undefined,
    };
    setListItems([...listItems, newItem]);
    setShowAddItemModal(false);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = listItems.filter(item => item.id !== itemId);
    
    // Update ranks if ranked list
    if (listData.isRanked) {
      const rerankedItems = updatedItems.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
      setListItems(rerankedItems);
    } else {
      setListItems(updatedItems);
    }
  };

  const handleMoveItem = (itemId: string, direction: "up" | "down") => {
    const currentIndex = listItems.findIndex(item => item.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= listItems.length) return;

    const newItems = [...listItems];
    [newItems[currentIndex], newItems[newIndex]] = [newItems[newIndex], newItems[currentIndex]];
    
    // Update ranks
    const rerankedItems = newItems.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
    
    setListItems(rerankedItems);
  };

  const handleItemsChange = (newItems: ListItem[]) => {
    setListItems(newItems);
  };

  // Publishing
  const canPublish = listData.title.trim() && listItems.length > 0;

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: async () => {
      if (!shareDestination) throw new Error("No share destination selected");

      // Prepare list data for API
      const payload = {
        name: listData.title,
        description: listData.description || null,
        tags: listData.tags,
        coverImage: listData.coverImage || null,
        isRanked: listData.isRanked,
        audience: shareDestination.type,
        circleId: shareDestination.circleId || null,
        items: listItems.map((item, index) => ({
          type: item.type,
          restaurantId: item.restaurant?.id || null,
          restaurantName: item.restaurant?.name || "",
          restaurantLocation: item.restaurant?.location || "",
          dishName: item.dish?.name || null,
          notes: item.notes || "",
          tags: item.tags || [],
          photo: item.photo || null,
          rank: listData.isRanked ? (item.rank || index + 1) : null,
        })),
      };

      const response = await apiRequest("/api/lists", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return response;
    },
    onSuccess: (data) => {
      setCreatedListId(data.id);
      setShowSuccessModal(true);
      clearDraft();
      
      toast({
        title: "List created successfully!",
        description: `"${listData.title}" has been published.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePublish = () => {
    if (!canPublish) return;
    createListMutation.mutate();
  };

  // Clear draft after successful creation
  const clearDraft = () => {
    localStorage.removeItem('create-list-draft');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopSidebar />
      
      <div className="lg:pl-64">
        <div className="container mx-auto px-4 py-6 pb-20 lg:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/lists")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  Let's build your list
                </h1>
                <p className="text-sm text-gray-500">Start with one place or dish — you can always add more later</p>
              </div>
            </div>
          </div>

          {/* Single Flow Content */}
          <div className="max-w-2xl mx-auto space-y-6">
            {/* List Details Section */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <Input
                placeholder="List title (e.g. Toronto Date Night)"
                value={listData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-lg font-medium border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-gray-400"
              />
              
              <Textarea
                placeholder="Optional: What's this list about?"
                value={listData.description || ""}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-gray-400 resize-none"
                rows={2}
              />
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ranking-toggle"
                    checked={listData.isRanked}
                    onCheckedChange={handleRankedToggle}
                  />
                  <Label htmlFor="ranking-toggle" className="text-sm font-medium">
                    Rank this list?
                  </Label>
                </div>
                
                <Button
                  onClick={() => setShowAddItemModal(true)}
                  disabled={!listData.title.trim()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add your first item
                </Button>
              </div>
            </div>

            {/* Live Preview - Items */}
            {listItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your List</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddItemModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                </div>

                {listData.isRanked ? (
                  <ListItemsSortable
                    items={listItems}
                    onItemsChange={handleItemsChange}
                    onDelete={handleDeleteItem}
                  />
                ) : (
                  <div className="space-y-3">
                    {listItems.map((item) => (
                      <ListItemPreview
                        key={item.id}
                        item={item}
                        isRanked={listData.isRanked}
                        totalItems={listItems.length}
                        onDelete={handleDeleteItem}
                        onMove={handleMoveItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Share Destination Cards */}
            {listItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <ShareDestinationCards
                  selected={shareDestination}
                  onChange={setShareDestination}
                />
              </div>
            )}

            {/* Publish Button */}
            {listItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <Button
                  onClick={handlePublish}
                  disabled={!canPublish || createListMutation.isPending}
                  className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700"
                >
                  {createListMutation.isPending ? (
                    "Publishing..."
                  ) : (
                    `Publish "${listData.title}"`
                  )}
                </Button>
                
                {!canPublish && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {!listData.title.trim() ? "Add a title to continue" : "Add at least one item to publish"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddListItemModal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        onSave={handleAddItem}
      />

      {shareDestination && (
        <PostSuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          listId={createdListId}
          listTitle={listData.title}
          destination={shareDestination}
          options={{
            view: `/lists/${createdListId}`,
            new: "/create-list-enhanced",
            home: "/",
          }}
          onNavigate={(path) => {
            setShowSuccessModal(false);
            navigate(path);
          }}
        />
      )}

      <MobileNavigation />
    </div>
  );
}