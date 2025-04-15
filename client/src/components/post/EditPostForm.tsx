import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPostSchema } from "@shared/schema";
import { PostWithDetails } from "@/lib/types";

// Create a zod schema for edit post validation
const editPostSchema = z.object({
  content: z.string().min(1, "Review content is required"),
  rating: z.number().min(1).max(5),
  visibility: z.string().min(1, "Visibility is required"),
  dishesTried: z.array(z.string()).optional(),
  priceAssessment: z.string().optional().nullable(),
  atmosphere: z.string().optional().nullable(),
  serviceRating: z.number().optional().nullable(),
  dietaryOptions: z.array(z.string()).optional(),
});

type EditPostFormValues = z.infer<typeof editPostSchema>;

interface EditPostFormProps {
  post: PostWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPostForm({ post, open, onOpenChange }: EditPostFormProps) {
  const { toast } = useToast();
  const [dishInput, setDishInput] = useState("");
  
  // Initialize form with current post data
  const form = useForm<EditPostFormValues>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      content: post.content,
      rating: post.rating,
      visibility: post.visibility,
      dishesTried: post.dishesTried || [],
      priceAssessment: post.priceAssessment || null,
      atmosphere: post.atmosphere || null,
      serviceRating: post.serviceRating || null,
      dietaryOptions: post.dietaryOptions || [],
    },
  });
  
  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: async (formData: EditPostFormValues) => {
      return await apiRequest("PUT", `/api/posts/${post.id}`, formData);
    },
    onSuccess: () => {
      // Invalidate any queries that may contain the post
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${post.userId}/posts`] });
      
      toast({
        title: "Post updated",
        description: "Your post has been successfully updated.",
      });
      
      // Close the dialog
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update post: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (formData: EditPostFormValues) => {
    updateMutation.mutate(formData);
  };
  
  // Handle adding a dish to the list
  const handleAddDish = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && dishInput.trim()) {
      e.preventDefault();
      const currentDishes = form.getValues("dishesTried") || [];
      form.setValue("dishesTried", [...currentDishes, dishInput.trim()]);
      setDishInput("");
    }
  };
  
  // Handle removing a dish from the list
  const handleRemoveDish = (index: number) => {
    const currentDishes = form.getValues("dishesTried") || [];
    form.setValue(
      "dishesTried",
      currentDishes.filter((_, i) => i !== index)
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Rating Field */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Rating 
                        value={field.value} 
                        onChange={field.onChange}
                        size="md"
                        readonly={false}
                        showValue={true}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Review Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Share your experience at this restaurant..."
                      className="resize-none"
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Dishes Tried Field */}
            <div>
              <FormLabel htmlFor="dishesTried">Dishes Tried</FormLabel>
              <div className="mt-1">
                <Input
                  id="dishesTried"
                  value={dishInput}
                  onChange={(e) => setDishInput(e.target.value)}
                  onKeyDown={handleAddDish}
                  placeholder="Type a dish and press Enter"
                  className="mb-2"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.watch("dishesTried")?.map((dish, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-neutral-100 rounded-full px-2 py-1 text-xs"
                    >
                      <span>{dish}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDish(index)}
                        className="ml-1 text-neutral-500 hover:text-neutral-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Visibility Field */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Public">Public</option>
                      <option value="Friends">Friends Only</option>
                      <option value="Private">Private</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Additional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priceAssessment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Assessment</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value || ""}
                      >
                        <option value="">Select...</option>
                        <option value="great value">Great Value</option>
                        <option value="fair">Fair</option>
                        <option value="overpriced">Overpriced</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="atmosphere"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atmosphere</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value || ""}
                      >
                        <option value="">Select...</option>
                        <option value="quiet">Quiet</option>
                        <option value="casual">Casual</option>
                        <option value="lively">Lively</option>
                        <option value="romantic">Romantic</option>
                        <option value="elegant">Elegant</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Post"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}