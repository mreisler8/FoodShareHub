
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Camera, Plus, X, GripVertical, MapPin, Star } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface ListItem {
  id: string;
  name: string;
  notes?: string;
  tags?: string[];
  city?: string;
  mediaUrl?: string;
  rank: number;
  rating?: number;
}

interface CreateListFormProps {
  onClose: () => void;
  onSuccess?: (listId: number) => void;
}

export function CreateListForm({ onClose, onSuccess }: CreateListFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"restaurant" | "dish">("restaurant");
  const [audience, setAudience] = useState<"profile" | "circle" | "public">("profile");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCity, setNewItemCity] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemRating, setNewItemRating] = useState<number>(5);

  // Add new item to the list
  const addItem = () => {
    if (!newItemName.trim()) {
      toast({ 
        title: "Item name required", 
        description: "Please enter a name for the item",
        variant: "destructive" 
      });
      return;
    }

    const newItem: ListItem = {
      id: `temp-${Date.now()}`,
      name: newItemName.trim(),
      city: newItemCity.trim() || undefined,
      notes: newItemNotes.trim() || undefined,
      rating: newItemRating,
      rank: items.length + 1,
      tags: []
    };

    setItems([...items, newItem]);
    
    // Clear form
    setNewItemName("");
    setNewItemCity("");
    setNewItemNotes("");
    setNewItemRating(5);
  };

  // Remove item from list
  const removeItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    // Re-rank items
    const reRankedItems = updatedItems.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
    setItems(reRankedItems);
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    // Update ranks
    const reRankedItems = reorderedItems.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    setItems(reRankedItems);
  };

  // Handle cover image upload
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save list mutation
  const saveListMutation = useMutation({
    mutationFn: async ({ isDraft = false }: { isDraft?: boolean } = {}) => {
      if (!title.trim()) {
        throw new Error("List title is required");
      }

      if (items.length === 0) {
        throw new Error("Please add at least one item to your list");
      }

      const payload = {
        name: title.trim(),
        description: description.trim() || undefined,
        type,
        audience,
        createdById: user?.id,
        visibility: audience === "public" ? { public: true, followers: true, circleIds: [] } : 
                   audience === "circle" ? { public: false, followers: false, circleIds: [] } :
                   { public: false, followers: true, circleIds: [] },
        makePublic: audience === "public",
        shareWithCircle: audience === "circle",
        tags: [],
        items: items.map(item => ({
          name: item.name,
          notes: item.notes,
          city: item.city,
          rating: item.rating,
          rank: item.rank,
          addedById: user?.id,
          restaurantId: undefined // For now, these are just text items
        }))
      };

      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save list");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "List created successfully!",
        description: `"${title}" has been saved to your profile.`,
      });
      onSuccess?.(data.id);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating list",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New List</h1>
          <p className="text-gray-600 mt-1">Build and rank your favorite {type}s</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <Separator />

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>List Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              List Title *
            </label>
            <Input
              placeholder="e.g., Best Pizza in NYC, Must-Try Ramen Spots"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <Textarea
              placeholder="Tell people what makes this list special..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              List Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="restaurant"
                  checked={type === "restaurant"}
                  onChange={() => setType("restaurant")}
                  className="text-primary"
                />
                <span>Restaurants</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="dish"
                  checked={type === "dish"}
                  onChange={() => setType("dish")}
                  className="text-primary"
                />
                <span>Dishes</span>
              </label>
            </div>
          </div>

          {/* Audience Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Who can see this list?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="profile"
                  checked={audience === "profile"}
                  onChange={() => setAudience("profile")}
                  className="text-primary"
                />
                <span>Just me</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="circle"
                  checked={audience === "circle"}
                  onChange={() => setAudience("circle")}
                  className="text-primary"
                />
                <span>My circles</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="public"
                  checked={audience === "public"}
                  onChange={() => setAudience("public")}
                  className="text-primary"
                />
                <span>Everyone</span>
              </label>
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Cover Image (Optional)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="cover-image"
                onChange={handleCoverImageChange}
                accept="image/*"
                className="hidden"
              />
              <label
                htmlFor="cover-image"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <Camera className="h-4 w-4" />
                Choose Image
              </label>
              {coverImagePreview && (
                <div className="relative">
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage(null);
                      setCoverImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Items */}
      <Card>
        <CardHeader>
          <CardTitle>Add Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === "restaurant" ? "Restaurant" : "Dish"} Name *
              </label>
              <Input
                placeholder={type === "restaurant" ? "Restaurant name" : "Dish name"}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addItem()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City (Optional)
              </label>
              <Input
                placeholder="e.g., New York"
                value={newItemCity}
                onChange={(e) => setNewItemCity(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addItem()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewItemRating(star)}
                    className={`p-1 ${star <= newItemRating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    <Star className="h-4 w-4 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <Button onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {newItemNotes !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <Textarea
                placeholder="Why is this special? What should people know?"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your List ({items.length} items)</CardTitle>
            <p className="text-sm text-gray-600">Drag to reorder</p>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="list-items">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
                              snapshot.isDragging ? "shadow-lg" : "shadow-sm"
                            }`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="text-gray-400 cursor-grab"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                            
                            <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full text-sm font-medium">
                              {item.rank}
                            </div>

                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              {item.city && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <MapPin className="h-3 w-3" />
                                  {item.city}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-sm text-gray-600 mt-1">{item.notes}</div>
                              )}
                            </div>

                            {item.rating && (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: item.rating }, (_, i) => (
                                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                                ))}
                              </div>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </CardContent>
        </Card>
      )}

      {/* Save Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onClose} disabled={saveListMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => saveListMutation.mutate()}
          disabled={saveListMutation.isPending || !title.trim() || items.length === 0}
          className="min-w-[120px]"
        >
          {saveListMutation.isPending ? "Saving..." : "Create List"}
        </Button>
      </div>
    </div>
  );
}
