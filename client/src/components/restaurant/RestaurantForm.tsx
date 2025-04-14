import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRestaurantSchema, InsertRestaurant } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Extend the schema with validations
const extendedRestaurantSchema = insertRestaurantSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
  category: z.string().min(2, "Category is required"),
  priceRange: z.string(),
  phone: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  description: z.string().optional(),
});

interface RestaurantFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<InsertRestaurant>;
  onSuccess?: (data: any) => void;
}

const priceRangeOptions = [
  { value: "$", label: "$ (Inexpensive)" },
  { value: "$$", label: "$$ (Moderate)" },
  { value: "$$$", label: "$$$ (Expensive)" },
  { value: "$$$$", label: "$$$$ (Very Expensive)" }
];

const categoryOptions = [
  "Italian", "Japanese", "Mexican", "Chinese", "American", "Indian", 
  "French", "Thai", "Mediterranean", "Korean", "Vietnamese", "Seafood",
  "Steakhouse", "Vegetarian", "Vegan", "Bakery", "Cafe", "Dessert",
  "Bar", "Pub", "Food Truck", "Fast Food", "Brunch", "Pizza", "Sushi",
  "Barbecue", "Sandwich", "Other"
];

export function RestaurantForm({ isOpen, onClose, initialData = {}, onSuccess }: RestaurantFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set up form
  const form = useForm<z.infer<typeof extendedRestaurantSchema>>({
    resolver: zodResolver(extendedRestaurantSchema),
    defaultValues: {
      name: initialData.name || "",
      location: initialData.location || "",
      category: initialData.category || "",
      priceRange: initialData.priceRange || "$",
      phone: initialData.phone || "",
      website: initialData.website || "",
      address: initialData.address || "",
      neighborhood: initialData.neighborhood || "",
      description: initialData.description || "",
    }
  });
  
  // Create or update restaurant mutation
  const restaurantMutation = useMutation({
    mutationFn: async (data: z.infer<typeof extendedRestaurantSchema>) => {
      const endpoint = initialData.id 
        ? `/api/restaurants/${initialData.id}` 
        : "/api/restaurants";
      
      const method = initialData.id ? "PATCH" : "POST";
      
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      
      toast({
        title: initialData.id ? "Restaurant updated" : "Restaurant added",
        description: initialData.id 
          ? `${form.getValues("name")} has been updated` 
          : `${form.getValues("name")} has been added to our database`,
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      onClose();
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error("Restaurant mutation error:", error);
      toast({
        title: "Error",
        description: "There was a problem saving the restaurant information",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  });
  
  // Form submission handler
  const onSubmit = (data: z.infer<typeof extendedRestaurantSchema>) => {
    setIsSubmitting(true);
    restaurantMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData.id ? "Edit Restaurant" : "Add New Restaurant"}
          </DialogTitle>
          <DialogDescription>
            {initialData.id 
              ? "Update the restaurant details below" 
              : "Enter the restaurant details below. Please ensure the information is accurate."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter restaurant name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category*</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priceRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Range*</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a price range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {priceRangeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City/Location*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., New York, Toronto, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Neighborhood</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Downtown, West End, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., (123) 456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the restaurant" 
                          {...field} 
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="text-xs text-neutral-500">
                  * Required fields
                </div>
              </CardContent>
            </Card>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData.id ? "Update Restaurant" : "Add Restaurant"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}