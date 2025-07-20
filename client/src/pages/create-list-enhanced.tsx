import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { CreateListForm } from "@/components/lists/CreateListForm";
import { AddListItemModal } from "@/components/lists/AddListItemModal";
import { ListItemPreview } from "@/components/lists/ListItemPreview";
import { ListItemsSortable } from "@/components/lists/ListItemsSortable";
import { ShareListDestinationPicker, ShareDestination } from "@/components/lists/ShareListDestinationPicker";
import { ListPreviewCard } from "@/components/lists/ListPreviewCard";
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

type Step = "details" | "items" | "share" | "preview" | "success";

export default function CreateListEnhanced() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Form state
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [listData, setListData] = useState<ListFormData>({
    title: "",
    description: "",
    coverImage: "",
    isRanked: false,
    tags: [],
  });
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [shareDestination, setShareDestination] = useState<ShareDestination>();
  const [createdListId, setCreatedListId] = useState<number>();
  
  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string>();

  // Step 1: List Details
  const handleListDetailsSubmit = (data: ListFormData) => {
    setListData(data);
    setCurrentStep("items");
  };

  // Step 2: Add Items
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

  // Step 3: Share Destination
  const handleShareDestinationContinue = () => {
    setCurrentStep("preview");
  };

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
      setCurrentStep("success");
      setShowSuccessModal(true);
      
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

  // Navigation helpers
  const handleBack = () => {
    switch (currentStep) {
      case "items":
        setCurrentStep("details");
        break;
      case "share":
        setCurrentStep("items");
        break;
      case "preview":
        setCurrentStep("share");
        break;
      default:
        navigate("/lists");
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case "items":
        setCurrentStep("share");
        break;
      case "share":
        setCurrentStep("preview");
        break;
      case "preview":
        createListMutation.mutate();
        break;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "details":
        return listData.title.trim().length > 0;
      case "items":
        return listItems.length > 0;
      case "share":
        return shareDestination && (shareDestination.type !== "circle" || shareDestination.circleId);
      case "preview":
        return true;
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "details": return "List Details";
      case "items": return "Add Items";
      case "share": return "Share Settings";
      case "preview": return "Preview & Publish";
      default: return "";
    }
  };

  // Prepare preview data
  const previewData = {
    title: listData.title,
    description: listData.description,
    coverImage: listData.coverImage,
    tags: listData.tags,
    items: listItems,
    isRanked: listData.isRanked,
    shareDestination: shareDestination || { type: "private" as const },
    author: user ? { name: user.name, avatar: user.profilePicture } : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      
      <div className="lg:pl-64">
        <div className="container mx-auto px-4 py-6 pb-20 lg:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold">Create List</h1>
                <p className="text-muted-foreground">{getStepTitle()}</p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="hidden md:flex items-center space-x-2">
              {["details", "items", "share", "preview"].map((step, index) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step
                      ? "bg-primary text-primary-foreground"
                      : index < ["details", "items", "share", "preview"].indexOf(currentStep)
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="max-w-4xl mx-auto">
            {currentStep === "details" && (
              <CreateListForm
                onSubmit={handleListDetailsSubmit}
                initialValues={listData}
              />
            )}

            {currentStep === "items" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{listData.title}</h2>
                    <p className="text-muted-foreground">
                      Add restaurants and dishes to your list
                    </p>
                  </div>
                  <Button onClick={() => setShowAddItemModal(true)}>
                    Add Item
                  </Button>
                </div>

                {listItems.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <p className="text-lg text-muted-foreground mb-4">
                      Start with one place or dish
                    </p>
                    <Button onClick={() => setShowAddItemModal(true)}>
                      Add Your First Item
                    </Button>
                  </div>
                ) : listData.isRanked ? (
                  <ListItemsSortable
                    items={listItems}
                    onItemsChange={handleItemsChange}
                    onDelete={handleDeleteItem}
                  />
                ) : (
                  <div className="space-y-4">
                    {listItems.map((item) => (
                      <ListItemPreview
                        key={item.id}
                        item={item}
                        onDelete={handleDeleteItem}
                        onMove={handleMoveItem}
                        totalItems={listItems.length}
                      />
                    ))}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddItemModal(true)}
                  >
                    Add Another Item
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={listItems.length === 0}
                    className="flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "share" && (
              <ShareListDestinationPicker
                selected={shareDestination}
                onChange={setShareDestination}
                onContinue={handleShareDestinationContinue}
                showContinueButton={true}
              />
            )}

            {currentStep === "preview" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Preview Your List</h2>
                  <p className="text-muted-foreground">
                    This is how your list will appear to others
                  </p>
                </div>

                <div className="flex justify-center">
                  <ListPreviewCard listData={previewData} />
                </div>

                <div className="flex justify-center space-x-4">
                  <Button variant="outline" onClick={handleBack}>
                    Make Changes
                  </Button>
                  <Button
                    onClick={() => createListMutation.mutate()}
                    disabled={createListMutation.isPending}
                    className="min-h-[48px] px-8"
                  >
                    {createListMutation.isPending ? "Publishing..." : "Publish List"}
                  </Button>
                </div>
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