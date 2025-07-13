import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CircleWithStats } from "@/lib/types";
import { useLocation } from "wouter";
import { AlertTriangle, Eye } from "lucide-react";

// Form Schema based on Robust List Creation user story
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
  shareWithCircle: z.boolean().default(false),
  makePublic: z.boolean().default(false),
  circleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (listId: number) => void;
}

export function CreateListModal({ open, onOpenChange, onSuccess }: CreateListModalProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [duplicateInfo, setDuplicateInfo] = useState<{id: number, name: string} | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [continueAnyway, setContinueAnyway] = useState(false);

  // Fetch circles for the sharing dropdown
  const { data: circles } = useQuery<CircleWithStats[]>({
    queryKey: ["/api/circles"],
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      tags: "",
      shareWithCircle: false,
      makePublic: false,
      circleId: undefined,
    },
  });

  // Watch the sharing fields to show/hide circle selection
  const shareWithCircle = form.watch("shareWithCircle");
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
      console.error("Error checking duplicate:", error);
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

  // Reset duplicate state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setDuplicateInfo(null);
      setContinueAnyway(false);
    }
  }, [open]);

  // Create list mutation
  const createList = useMutation({
    mutationFn: async (values: FormValues) => {
      // Apply default sharing rules if neither option is selected
      let shareWithCircle = values.shareWithCircle;
      let makePublic = values.makePublic;
      
      if (!shareWithCircle && !makePublic) {
        shareWithCircle = true; // Default to circle sharing
      }

      // Convert circleId to number if provided
      const circleId = values.circleId && values.circleId !== "none" ? parseInt(values.circleId) : null;

      // Parse tags into array
      const tags = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

      const payload = {
        name: values.name,
        description: values.description || null,
        tags: tags,
        circleId: circleId,
        isPublic: makePublic,
        visibility: makePublic ? "public" : "circle",
      };

      const response = await apiRequest("POST", "/api/lists", payload);
      return await response.json();
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
      onOpenChange(false);

      // Navigate directly to the list - handle different response structures
      const listId = data?.id || (data as any)?.id;
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
      // Handle 409 conflict for duplicate names
      if (error.status === 409 && error.data?.error === 'duplicate_list') {
        setDuplicateInfo({ 
          id: error.data.existingId, 
          name: form.getValues("name") 
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to create list. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: FormValues) => {
    createList.mutate(values);
  };

  // Check if form is valid (name is non-empty)
  const isFormValid = form.watch("name").trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
          <DialogDescription>
            Create a themed list of restaurant recommendations to share with your circles.
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

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., pizza, italian, family-friendly" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
                  <FormLabel>Sharing Settings</FormLabel>
                  
                  <FormField
                    control={form.control}
                    name="shareWithCircle"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Share with Circle</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Allow members of your circles to view this list
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="makePublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Make Public</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Anyone can view and share this list
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

            {shareWithCircle && (
              <FormField
                control={form.control}
                name="circleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Circle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a circle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {circles?.map((circle) => (
                          <SelectItem key={circle.id} value={circle.id.toString()}>
                            {circle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!isFormValid || createList.isPending}
              >
                {createList.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}