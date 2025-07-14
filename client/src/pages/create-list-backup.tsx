import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Search, Plus, Star, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CircleWithStats } from "@/lib/types";
import { RestaurantSearchAndAdd } from "@/components/lists/RestaurantSearchAndAdd";
import { DraggableRestaurantList } from "@/components/lists/DraggableRestaurantList";

// Form Schema based on Robust List Creation user story
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
  audience: z.enum(["profile", "circle", "public"]).default("profile"),
  circleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Restaurant {
  id: number;
  name: string;
  location: string;
  category: string;
  priceRange: string;
  imageUrl?: string;
  averageRating?: number;
  totalPosts?: number;
}

interface ListItem {
  id: string;
  restaurant: Restaurant;
  notes?: string;
  personalRating?: number;
  rank: number;
}

export default function CreateList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  
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
      tags: "",
      audience: "profile",
      circleId: undefined,
    },
  });
  
  // Helper functions
  const handleAddRestaurant = (restaurant: Restaurant) => {
    const newItem: ListItem = {
      id: `item-${Date.now()}-${restaurant.id}`,
      restaurant,
      rank: listItems.length + 1,
    };
    setListItems([...listItems, newItem]);
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = listItems.filter(item => item.id !== itemId);
    // Update ranks
    const rerankedItems = updatedItems.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
    setListItems(rerankedItems);
  };

  const handleItemsChange = (newItems: ListItem[]) => {
    setListItems(newItems);
  };

  // Create list mutation
  const createList = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert circleId to number if provided
      const circleId = values.circleId && values.circleId !== "none" ? parseInt(values.circleId) : null;

      // Parse tags into array
      const tags = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

      // Convert list items to API format
      const items = listItems.map(item => ({
        name: item.restaurant.name,
        notes: item.notes || "",
        rating: item.personalRating || undefined,
        rank: item.rank,
        restaurantId: item.restaurant.id,
      }));

      const payload = {
        name: values.name,
        description: values.description || null,
        tags: tags,
        audience: values.audience,
        circleId: circleId,
        items: items,
      };
      
      // Use the new /api/lists endpoint
      const response = await apiRequest("POST", "/api/lists", payload);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "Success!",
        description: "Your restaurant list has been created.",
      });
      
      // Navigate directly to the list - handle different response structures
      const listId = data?.id;
      if (listId) {
        try {
          navigate(`/lists/${listId}`);
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
      <div className="flex-1 max-w-4xl mx-auto px-4 py-8 md:px-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Utensils className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-neutral-900 mb-2">Create New Restaurant List</h1>
          <p className="text-neutral-600 text-lg">Share your favorite spots and help others discover amazing places</p>
        </div>
        
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="pt-8 px-8 pb-8">
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
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who can see this list?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="profile">Private - Only me</SelectItem>
                          <SelectItem value="circle">Circle - My circles only</SelectItem>
                          <SelectItem value="public">Public - Everyone</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("audience") === "circle" && (
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
                    disabled={createList.isPending || !form.watch("name").trim()}
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