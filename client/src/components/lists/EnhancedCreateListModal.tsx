import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CircleWithStats } from "@/lib/types";
import { useLocation } from "wouter";
import { AlertTriangle, Eye, Utensils, X, Plus, Tag, Check } from "lucide-react";
import PrivacySelector, { VisibilityLevel } from "@/components/privacy/PrivacySelector";

// Enhanced form schema with unified privacy
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  visibility: z.enum(['public', 'circle', 'followers', 'private']).default('circle'),
  circleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EnhancedCreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (listId: number) => void;
}

// Predefined tag suggestions
const PREDEFINED_TAGS = [
  "pizza", "italian", "date-night", "family-friendly", "cheap-eats", 
  "brunch", "happy-hour", "rooftop", "takeout", "delivery",
  "vegetarian", "vegan", "seafood", "steakhouse", "sushi",
  "coffee", "dessert", "bakery", "bar", "cocktails"
];

export function EnhancedCreateListModal({ open, onOpenChange, onSuccess }: EnhancedCreateListModalProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [duplicateInfo, setDuplicateInfo] = useState<{id: number, name: string} | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [continueAnyway, setContinueAnyway] = useState(false);
  
  // Custom tag management
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // Fetch circles for the sharing dropdown
  const { data: circles } = useQuery<CircleWithStats[]>({
    queryKey: ["/api/circles"],
  });

  // Form setup with smart defaults
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: 'circle', // Default to circle for food content
      circleId: undefined,
    },
  });

  // Watch fields for dynamic UI
  const visibility = form.watch("visibility");
  const currentName = form.watch("name");

  // Debounced duplicate checking function
  const checkDuplicate = useCallback(async (name: string) => {
    if (!name.trim()) {
      setDuplicateInfo(null);
      return;
    }

    setCheckingDuplicate(true);
    try {
      const response = await fetch(`/api/lists?name=${encodeURIComponent(name.trim())}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const lists = await response.json();
        if (lists.length > 0) {
          setDuplicateInfo({ id: lists[0].id, name: name.trim() });
        } else {
          setDuplicateInfo(null);
        }
      }
    } catch (error) {
      console.error('Error checking duplicate:', error);
    } finally {
      setCheckingDuplicate(false);
    }
  }, []);

  // Debounce the duplicate check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentName && !continueAnyway) {
        checkDuplicate(currentName);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentName, checkDuplicate, continueAnyway]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setDuplicateInfo(null);
      setContinueAnyway(false);
      setCustomTags([]);
      setNewTagInput("");
      setShowTagInput(false);
    }
  }, [open]);

  // Add custom tag
  const addCustomTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !customTags.includes(trimmedTag)) {
      setCustomTags(prev => [...prev, trimmedTag]);
    }
    setNewTagInput("");
    setShowTagInput(false);
  };

  // Remove custom tag
  const removeCustomTag = (tagToRemove: string) => {
    setCustomTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  // Toggle predefined tag
  const togglePredefinedTag = (tag: string) => {
    if (customTags.includes(tag)) {
      removeCustomTag(tag);
    } else {
      addCustomTag(tag);
    }
  };

  // Create list mutation with enhanced data contract
  const createList = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert circleId to number if provided
      const circleId = values.circleId && values.circleId !== "none" ? parseInt(values.circleId) : null;

      // Build payload with proper data contract alignment
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        tags: customTags,
        visibility: values.visibility,
        circleId: circleId,
        shareWithCircle: values.visibility === 'circle' && circleId,
        makePublic: values.visibility === 'public',
        isPublic: values.visibility === 'public', // Backward compatibility
      };

      console.log('Creating list with payload:', payload);
      return await apiRequest("/api/lists", { method: "POST", body: payload });
    },
    onSuccess: (data) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });

      toast({
        title: "Success!",
        description: "Your restaurant list has been created.",
      });

      // Reset form and close modal
      form.reset();
      setCustomTags([]);
      onOpenChange(false);

      // Navigate directly to the list
      const listId = data?.id;
      if (listId) {
        try {
          navigate(`/lists/${listId}`);
          if (onSuccess) {
            onSuccess(Number(listId));
          }
        } catch (error) {
          console.error("Navigation failed:", error);
          toast({
            title: "Navigation Error",
            description: "Couldn't open your list—please try again.",
            variant: "destructive",
          });
        }
      } else {
        console.error("No list ID in response:", data);
        toast({
          title: "Error",
          description: "List created but couldn't navigate to it.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Create list error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    createList.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-green-600" />
            Create New List
          </DialogTitle>
          <DialogDescription>
            Create a curated list of restaurants to share with your circles.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>List Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Best Pizza in Toronto" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duplicate warning banner */}
            {duplicateInfo && !continueAnyway && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="space-y-3">
                    <p>
                      You already have a list named "{duplicateInfo.name}".
                      Would you like to view it or continue creating?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/lists/${duplicateInfo.id}`);
                        }}
                        className="bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Existing
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setContinueAnyway(true);
                          setDuplicateInfo(null);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        Continue Anyway
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell people about this list..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Enhanced Privacy Selector */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Privacy Settings</FormLabel>
                  <FormControl>
                    <PrivacySelector
                      value={field.value}
                      onChange={field.onChange}
                      contentType="list"
                      showPreview={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Circle selection for circle visibility */}
            {visibility === 'circle' && (
              <FormField
                control={form.control}
                name="circleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share with Circle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a circle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific circle</SelectItem>
                        {circles?.map((circle) => (
                          <SelectItem key={circle.id} value={circle.id.toString()}>
                            {circle.name} ({circle.memberCount} members)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Enhanced Custom Tag System */}
            <div className="space-y-3">
              <FormLabel className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags (Optional)
              </FormLabel>
              
              {/* Selected tags display */}
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200"
                    >
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-green-600" 
                        onClick={() => removeCustomTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Quick tag buttons */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Quick tags:</p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_TAGS.slice(0, 8).map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => togglePredefinedTag(tag)}
                      className={`text-xs ${
                        customTags.includes(tag) 
                          ? 'bg-green-100 border-green-300 text-green-800' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {customTags.includes(tag) && <Check className="h-3 w-3 mr-1" />}
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom tag input */}
              {showTagInput ? (
                <div className="flex gap-2">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Enter custom tag..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomTag(newTagInput);
                      }
                      if (e.key === 'Escape') {
                        setShowTagInput(false);
                        setNewTagInput("");
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addCustomTag(newTagInput)}
                    disabled={!newTagInput.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowTagInput(false);
                      setNewTagInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTagInput(true)}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Tag
                </Button>
              )}
            </div>



            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={createList.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createList.isPending || (duplicateInfo && !continueAnyway)}
                className="bg-green-600 hover:bg-green-700"
              >
                {createList.isPending ? "Creating..." : "Create List"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}