import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Plus, Search, X, GripVertical, MapPin, Star, Users, Globe, Lock, Eye, EyeOff, Utensils, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GlobalHeader } from '@/components/ui/GlobalHeader';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { AddListItemModal } from "@/components/lists/AddListItemModal";
import { ListItemPreview } from "@/components/lists/ListItemPreview";
import { ShareDestinationCards } from "@/components/lists/ShareDestinationCards";
import { PostSuccessModal } from "@/components/lists/PostSuccessModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ListItemData } from "@/components/lists/AddListItemModal";
import { useMutation } from "@tanstack/react-query";
// PageHeader replaced with AppHeader which is already imported

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

  // UI state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListId, setCreatedListId] = useState<number | null>(null);

  // Auto-save to localStorage
  useEffect(() => {
    const draftData = {
      listData,
      listItems,
      shareDestination,
      timestamp: Date.now()
    };
    localStorage.setItem('list-creation-draft', JSON.stringify(draftData));
  }, [listData, listItems, shareDestination]);

  // Load draft on mount
  useEffect(() => {
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
  }, []);

  const createListMutation = useMutation({
    mutationFn: async (data: any) => {
      // First create the list
      const listResponse = await apiRequest("/api/lists", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          tags: data.tags,
          shareWithCircle: data.shareWithCircle,
          makePublic: data.makePublic,
          circleId: data.circleId,
          type: "restaurant",
          audience: data.makePublic ? "public" : (data.shareWithCircle ? "circle" : "profile")
        }),
      });

      // Parse the response to get the actual list data
      const newList = await listResponse.json();

      // Then add restaurants to the list if any
      if (data.restaurants && data.restaurants.length > 0) {
        const restaurantPromises = data.restaurants.map((restaurant: any, index: number) => 
          apiRequest(`/api/lists/${newList.id}/restaurants`, {
            method: "POST",
            body: JSON.stringify({
              name: restaurant.name,
              location: restaurant.location || "Location not specified",
              notes: restaurant.notes || "",
              position: index + 1,
              tags: restaurant.tags || []
            }),
          })
        );

        await Promise.all(restaurantPromises);
      }

      return newList;
    },
    onSuccess: (data: any) => {
      setCreatedListId(data?.id || null);
      setShowSuccessModal(true);
      localStorage.removeItem('list-creation-draft');
      toast({
        title: "List Created Successfully!",
        description: `"${listData.title}" with ${listItems.length} restaurant${listItems.length !== 1 ? 's' : ''} has been created.`,
      });
    },
    onError: (error: any) => {
      console.error('Create list error:', error);
      if (error.message?.includes("409") || error.toString().includes("duplicate")) {
        toast({
          title: "List Already Exists",
          description: "You already have a list with this name. Try a different name.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Creating List",
          description: "There was a problem creating your list. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleQuickTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setListData(prev => ({
      ...prev,
      title: template.text,
      tags: template.tags,
      description: `A curated collection of ${template.text.toLowerCase()}`
    }));
  };

  const handleAddListItem = (item: ListItemData) => {
    const newItem: ListItem = {
      ...item,
      id: `temp-${Date.now()}`,
      rank: listItems.length + 1
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
        title: "Title Required",
        description: "Please enter a title for your list.",
        variant: "destructive",
      });
      return;
    }

    if (listItems.length === 0) {
      toast({
        title: "Add Restaurants",
        description: "Please add at least one restaurant to your list.",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      name: listData.title,
      description: listData.description,
      tags: listData.tags,
      isRanked: listData.isRanked,
      shareWithCircle: shareDestination.type === "circle",
      makePublic: shareDestination.type === "public",
      circleId: shareDestination.circleId,
      restaurants: listItems.map((item, index) => ({
        name: item.restaurant?.name || "",
        location: item.restaurant?.location || "",
        notes: item.notes || "",
        tags: item.tags || [],
        dishName: item.dish?.name,
        rank: listData.isRanked ? index + 1 : undefined
      }))
    };

    createListMutation.mutate(submitData);
  };

  const getCompletionStatus = () => {
    const hasTitle = listData.title.trim().length > 0;
    const hasItems = listItems.length > 0;
    const hasDestination = shareDestination.type !== "private" || true; // Private is always valid
    const hasDescription = listData.description?.trim()?.length ?? 0 > 0;

    return {
      title: hasTitle,
      items: hasItems,
      destination: hasDestination,
      description: hasDescription,
      complete: hasTitle && hasItems && hasDestination,
      completionPercentage: Math.round(((hasTitle ? 1 : 0) + (hasItems ? 1 : 0) + (hasDestination ? 1 : 0) + (hasDescription ? 0.5 : 0)) / 3.5 * 100)
    };
  };

  const status = getCompletionStatus();

  return (
    <>
      <GlobalHeader title="Create a List" showBackButton={true} />
      <div className="min-h-screen bg-gray-50 pt-16">
        <main className="max-w-2xl mx-auto pb-20">
          {/* Content starts here - header removed since it's now in GlobalHeader */}
          <div className="bg-white border-b sticky top-16 z-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-lg font-semibold">Create a List</h1>
              </div>

              <div>{/* Completion status or other info */}</div>
            </div>
          </div>

          <div className="px-4 py-6">
            {/* List creation form */}
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">List Title</label>
                <input
                  type="text"
                  id="title"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={listData.title}
                  onChange={(e) => setListData({ ...listData, title: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id="description"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={listData.description}
                  onChange={(e) => setListData({ ...listData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Restaurants</label>
                {listItems.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">No restaurants added yet.</p>
                ) : (
                  <ul>
                    {listItems.map((item, index) => (
                      <li key={item.id} className="py-2 border-b">
                        {item.restaurant?.name}
                      </li>
                    ))}
                  </ul>
                )}
                <Button onClick={() => setShowAddItemModal(true)} className="mt-2">Add Restaurant</Button>
              </div>

              <Button onClick={handleSubmit} className="w-full">Create List</Button>
            </div>
          </div>
        </main>

        {/* Add Item Modal */}
        <AddListItemModal
          open={showAddItemModal}
          onOpenChange={setShowAddItemModal}
          onSave={handleAddListItem}
        />
      </div>
    </>
  );
}