import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { PageHeader } from "@/components/ui/PageHeader";

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
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <DesktopSidebar />
        <main className="flex-1 ml-64">
          {/* App Header with back button and logo */}
          <PageHeader 
            title="Create List" 
            showBackButton={true}
            showLogo={false}
          />

          <div className="max-w-4xl mx-auto px-6 py-8 pt-14">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Let's build your list</h1>
                  <p className="text-gray-600">Start with one place or dish — you can always add more later</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
                      style={{ width: `${status.completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{status.completionPercentage}%</span>
                </div>
                {status.title && <Badge variant="secondary" className="bg-green-100 text-green-800">Title ✓</Badge>}
                {status.items && <Badge variant="secondary" className="bg-green-100 text-green-800">{listItems.length} Restaurants ✓</Badge>}
              </div>
            </div>

            {/* Quick Templates */}
            {!listData.title && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Quick Start Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {QUICK_TEMPLATES.map((template, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleQuickTemplate(template)}
                        className="h-auto p-4 text-left flex flex-col items-start gap-1"
                      >
                        <span className="text-lg">{template.emoji}</span>
                        <span className="font-medium">{template.text}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* List Details Form */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  List Details
                  {!status.title && (
                    <span className="text-sm text-gray-500 font-normal">Start by giving your list a memorable name</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">List Title *</Label>
                  <Input
                    id="title"
                    value={listData.title}
                    onChange={(e) => setListData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Best Pizza in Toronto"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={listData.description}
                    onChange={(e) => setListData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell people what makes this list special..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ranked"
                    checked={listData.isRanked}
                    onCheckedChange={(checked) => setListData(prev => ({ ...prev, isRanked: checked }))}
                  />
                  <Label htmlFor="ranked">Make this a ranked list (1st, 2nd, 3rd...)</Label>
                </div>
              </CardContent>
            </Card>

            {/* List Items */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your List ({listItems.length} items)</CardTitle>
                  <Button onClick={() => setShowAddItemModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Restaurant
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {listItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">🍽️</div>
                    <p className="text-lg mb-2">Ready to add your first spot?</p>
                    <p className="mb-4">Great lists start with one amazing place</p>
                    <Button 
                      onClick={() => setShowAddItemModal(true)}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Restaurant
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listItems.map((item, index) => (
                      <div key={item.id} className="relative">
                        <ListItemPreview 
                          item={{...item, rank: listData.isRanked ? index + 1 : undefined}}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-red-100"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Share Destination */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Share With</CardTitle>
              </CardHeader>
              <CardContent>
                <ShareDestinationCards
                  selected={shareDestination}
                  onChange={setShareDestination}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!status.complete || createListMutation.isPending}
                size="lg"
                className="min-w-[200px]"
              >
                {createListMutation.isPending ? (
                  "Creating List..."
                ) : status.complete ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create List
                  </>
                ) : (
                  `Create List (${!status.title ? 'Add title' : !status.items ? 'Add restaurants' : 'Ready'})`
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* App Header with back button and logo */}
        <PageHeader 
          title="Create List" 
          showBackButton={true}
          showLogo={false}
        />

        <div className="px-4 py-6 pb-24 pt-14">
          {/* Mobile Header */}
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold">Let's build your list</h1>
              <p className="text-sm text-gray-600">Start with one place or dish</p>
            </div>
          </div>

          {/* Mobile Content - Same structure but condensed */}
          {/* Quick Templates */}
          {!listData.title && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TEMPLATES.slice(0, 4).map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleQuickTemplate(template)}
                      className="h-auto p-3 text-left"
                      size="sm"
                    >
                      <span className="text-sm">{template.text}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mobile Form */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="mobile-title">List Title *</Label>
              <Input
                id="mobile-title"
                value={listData.title}
                onChange={(e) => setListData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Best Pizza in Toronto"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="mobile-description">Description</Label>
              <Textarea
                id="mobile-description"
                value={listData.description}
                onChange={(e) => setListData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What makes this list special..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Mobile List Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Restaurants ({listItems.length})</Label>
                <Button onClick={() => setShowAddItemModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {listItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No restaurants yet - tap Add to start</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listItems.map((item, index) => (
                    <div key={item.id} className="relative">
                      <ListItemPreview 
                        item={{...item, rank: listData.isRanked ? index + 1 : undefined}}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Share Options */}
            <div>
              <Label className="mb-4 block">Share With</Label>
              <ShareDestinationCards
                selected={shareDestination}
                onChange={setShareDestination}
              />
            </div>

            {/* Mobile Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!status.complete || createListMutation.isPending}
              className="w-full"
              size="lg"
            >
              {createListMutation.isPending ? "Creating..." : "Create List"}
            </Button>
          </div>
        </div>
        <MobileNavigation />
      </div>

      {/* Modals */}
      <AddListItemModal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        onSave={handleAddListItem}
      />

      {createdListId && (
        <PostSuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          listId={createdListId}
          listTitle={listData.title}
          destination={shareDestination}
          options={{
            view: `/lists/${createdListId}`,
            new: "/create-list",
            home: "/"
          }}
          onNavigate={(path) => {
            setShowSuccessModal(false);
            navigate(path);
          }}
        />
      )}
    </div>
  );
}