import { useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CircleWithStats } from "@/lib/types";

// Form Schema
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  circleId: z.string().optional(),
  isPublic: z.boolean().default(true),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Fetch circles for the dropdown
  const { data: circles } = useQuery<CircleWithStats[]>({
    queryKey: ["/api/circles"],
  });
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      circleId: "",
      isPublic: true,
      tags: "",
    },
  });
  
  // Create list mutation
  const createList = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert tags from comma-separated string to array
      const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      // Convert circleId from string to number or null
      const circleId = values.circleId ? parseInt(values.circleId) : null;
      
      // Create payload
      const payload = {
        name: values.name,
        description: values.description || null,
        isPublic: values.isPublic,
        circleId: circleId,
        tags: tagsArray.length > 0 ? tagsArray : null,
        // Add createdById which is required
        createdById: 1, // Using the current user ID
        // Add required fields from schema
        visibility: values.isPublic ? 'public' : 'private',
      };
      
      // Use the new /api/lists endpoint
      return await apiRequest("POST", "/api/lists", payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "Success!",
        description: "Your restaurant list has been created.",
      });
      
      // Navigate to the new list
      navigate(`/lists/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create restaurant list. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    createList.mutate(values);
  };
  
  // Set page title
  useEffect(() => {
    document.title = "Create New List | Circles";
    return () => {
      document.title = "Circles";
    };
  }, []);
  
  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-3xl mx-auto px-4 py-6 md:px-8">
        <h1 className="text-2xl font-heading font-bold text-neutral-900 mb-6">Create New Restaurant List</h1>
        
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>List Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Best Brunch Spots" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your list (optional)" 
                          className="min-h-24" 
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
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., brunch, cheap-eats, date-night (comma separated)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="circleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Share with Circle (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a circle (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Don't share with a circle</SelectItem>
                          {circles?.map(circle => (
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
                
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Make this list public</FormLabel>
                        <p className="text-sm text-neutral-500">
                          Public lists are visible to everyone. Private lists are only visible to you and members of the circle (if selected).
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createList.isPending}
                  >
                    {createList.isPending ? "Creating..." : "Create List"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}