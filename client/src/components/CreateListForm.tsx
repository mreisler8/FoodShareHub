import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ListItemForm } from "@/components/ListItemForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { X, Plus, Upload, GripVertical } from "lucide-react";

interface ListItem {
  name: string;
  notes?: string;
  tags?: string[];
  city?: string;
  mediaUrl?: string;
  rank?: number;
  rating?: number;
  restaurantId?: number;
}

interface CreateListFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateListForm({ onClose, onSuccess }: CreateListFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"restaurant" | "dish">("restaurant");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [audience, setAudience] = useState<"profile" | "circle" | "public">("profile");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { name: "", rank: items.length + 1 }]);
  };

  const updateItem = (index: number, item: Partial<ListItem>) => {
    const updated = [...items];
    updated[index] = { ...updated[index], ...item };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    // Update ranks
    newItems.forEach((item, index) => {
      item.rank = index + 1;
    });
    setItems(newItems);
  };

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

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const saveList = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a list title", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to create a list", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: title.trim(),
        description: description.trim(),
        type,
        audience,
        tags,
        createdById: user.id,
        // Handle visibility based on audience
        visibility: audience === "public" ? { public: true, followers: false, circleIds: [] } : 
                   audience === "circle" ? { public: false, followers: false, circleIds: [] } :
                   { public: false, followers: true, circleIds: [] },
        makePublic: audience === "public",
        shareWithCircle: audience === "circle",
        // TODO: Handle coverImage upload if backend supports it
        items: items.map((item, index) => ({
          ...item,
          rank: index + 1,
          addedById: user.id
        }))
      };

      const response = await apiRequest(`/api/lists`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({ 
          title: "List created successfully", 
          description: `Your ${type} list "${title}" has been created.`
        });
        onSuccess?.();
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create list');
      }
    } catch (error) {
      console.error('Error creating list:', error);
      toast({ 
        title: "Error creating list", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create New List</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>List Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">List Title *</Label>
            <Input 
              id="title"
              placeholder="Enter list title..." 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              placeholder="Describe your list..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>List Type</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as "restaurant" | "dish")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="restaurant" id="restaurant" />
                <Label htmlFor="restaurant">Restaurants</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dish" id="dish" />
                <Label htmlFor="dish">Dishes</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Audience</Label>
            <RadioGroup value={audience} onValueChange={(value) => setAudience(value as "profile" | "circle" | "public")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="profile" id="profile" />
                <Label htmlFor="profile">Profile - Only you can see this</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="circle" id="circle" />
                <Label htmlFor="circle">Circle - Share with your circles</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public">Public - Anyone can see this</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cover Image (Optional)</Label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                onChange={handleCoverImageChange}
                accept="image/*"
                className="hidden"
                id="cover-image"
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('cover-image')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose Image
              </Button>
              {coverImagePreview && (
                <div className="relative">
                  <img src={coverImagePreview} alt="Cover preview" className="w-16 h-16 object-cover rounded" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={() => {
                      setCoverImage(null);
                      setCoverImagePreview(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>List Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <GripVertical className="h-4 w-4 cursor-move" />
                <span>#{index + 1}</span>
              </div>
              <div className="flex-1 space-y-3">
                <Input
                  placeholder={`${type === 'restaurant' ? 'Restaurant' : 'Dish'} name`}
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={item.city || ''}
                    onChange={(e) => updateItem(index, { city: e.target.value })}
                  />
                  <Input
                    placeholder="Tags (comma-separated)"
                    value={item.tags?.join(', ') || ''}
                    onChange={(e) => updateItem(index, { tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                  />
                </div>
                <Textarea
                  placeholder="Notes or description..."
                  value={item.notes || ''}
                  onChange={(e) => updateItem(index, { notes: e.target.value })}
                  rows={2}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button onClick={addItem} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add {type === 'restaurant' ? 'Restaurant' : 'Dish'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={saveList} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create List'}
        </Button>
      </div>
    </div>
  );
}