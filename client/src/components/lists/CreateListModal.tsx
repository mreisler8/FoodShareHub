import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CircleWithStats } from "@/lib/types";

// Form Schema based on User Story 2 requirements
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  visibility: z.enum(["public", "circle"]).default("public"),
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

  // Fetch circles for the visibility dropdown
  const { data: circles } = useQuery<CircleWithStats[]>({
    queryKey: ["/api/circles"],
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: "public",
      circleId: undefined,
    },
  });

  // Watch the visibility field to show/hide circle selection
  const visibility = form.watch("visibility");

  // Create list mutation
  const createList = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert circleId to number if provided
      const circleId = values.circleId && values.circleId !== "none" ? parseInt(values.circleId) : null;

      const payload = {
        name: values.name,
        description: values.description || null,
        circleId: circleId,
        visibility: values.visibility,
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

      // Call success callback with the new list ID - handle different response structures
      if (onSuccess) {
        const listId = data?.id || (data as any)?.id;
        if (listId) {
          onSuccess(Number(listId));
        } else {
          console.error("No list ID in response:", data);
        }
      }
    },
    onError: (error: any) => {
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
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">Public - Anyone with link can view</SelectItem>
                      <SelectItem value="circle">Circle - Only circle members can view</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {visibility === "circle" && (
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