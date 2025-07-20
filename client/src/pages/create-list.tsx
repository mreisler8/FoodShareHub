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
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CircleWithStats } from "@/lib/types";
import RestaurantSearchAndAdd from "@/components/lists/RestaurantSearchAndAdd";
import DraggableRestaurantList from "@/components/lists/DraggableRestaurantList";

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
      toast({
        title: "Success",
        description: "Restaurant list created successfully!",
      });
      
      // Clear form
      form.reset();
      setListItems([]);
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      
      // Navigate to the list detail page
      if (data && data.id) {
        const listId = data.id;
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
  
  // Watch form values at the top level to avoid hook violations
  const watchedAudience = form.watch("audience");
  const watchedName = form.watch("name");
  
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
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-heading font-bold text-neutral-900">Create New Restaurant List</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Build a curated list of restaurants with drag-and-drop ranking
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {listItems.length} restaurant{listItems.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-xs text-gray-500">
              {watchedName ? '1' : '0'}/3 steps completed
            </span>
          </div>
          <div className="flex space-x-2">
            <div className={`h-2 flex-1 rounded-full ${watchedName ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${listItems.length > 0 ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${listItems.length > 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Details</span>
            <span>Add Items</span>
            <span>Finalize</span>
          </div>
        </div>

        {/* Modern Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center space-x-2 relative">
              <Utensils className="h-4 w-4" />
              <span>List Details</span>
              {watchedName && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center space-x-2 relative">
              <Search className="h-4 w-4" />
              <span>Add Restaurants</span>
              {listItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                  {listItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Rank & Review</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="mt-6">
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>List Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...form}>
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>List Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input placeholder="e.g., Best Brunch Spots" {...field} />
                                {!field.value && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-sm z-10">
                                    <div className="p-2 text-xs text-muted-foreground border-b">
                                      Quick suggestions:
                                    </div>
                                    <div className="p-1 space-y-1">
                                      {[
                                        "Best Pizza Places",
                                        "Date Night Favorites", 
                                        "Hidden Gems",
                                        "Weekend Brunch Spots",
                                        "Work Lunch Options"
                                      ].map((suggestion) => (
                                        <button
                                          key={suggestion}
                                          type="button"
                                          className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded"
                                          onClick={() => field.onChange(suggestion)}
                                        >
                                          {suggestion}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
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
                              <div>
                                <Input 
                                  placeholder="e.g., brunch, cheap-eats, date-night (comma separated)" 
                                  {...field} 
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {[
                                    "brunch", "date-night", "cheap-eats", "family-friendly", 
                                    "romantic", "casual", "fine-dining", "outdoor-seating"
                                  ].map((tag) => (
                                    <button
                                      key={tag}
                                      type="button"
                                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                                      onClick={() => {
                                        const currentTags = field.value ? field.value.split(',').map(t => t.trim()) : [];
                                        if (!currentTags.includes(tag)) {
                                          const newTags = [...currentTags, tag].join(', ');
                                          field.onChange(newTags);
                                        }
                                      }}
                                    >
                                      + {tag}
                                    </button>
                                  ))}
                                </div>
                              </div>
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

                      {watchedAudience === "circle" && (
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
                    </div>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="restaurants">
              <Card>
                <CardHeader>
                  <CardTitle>Add Restaurants</CardTitle>
                  <p className="text-sm text-muted-foreground">Search and add restaurants to your list</p>
                </CardHeader>
                <CardContent>
                  <RestaurantSearchAndAdd 
                    onAddRestaurant={handleAddRestaurant} 
                    addedRestaurants={listItems.map(item => item.restaurant)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ranking">
              <Card>
                <CardHeader>
                  <CardTitle>Rank & Review Your List</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {listItems.length === 0 ? "Add restaurants first to start ranking" : `Drag to reorder your ${listItems.length} restaurant${listItems.length !== 1 ? 's' : ''}`}
                  </p>
                </CardHeader>
                <CardContent>
                  {listItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No restaurants added yet</p>
                      <p className="text-xs mt-1">Go to the "Add Restaurants" tab to get started</p>
                    </div>
                  ) : (
                    <DraggableRestaurantList 
                      items={listItems}
                      onItemsChange={handleItemsChange}
                      onRemoveItem={handleRemoveItem}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Create Button */}
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={() => form.handleSubmit(onSubmit)()}
            disabled={createList.isPending || !watchedName.trim()}
            size="lg"
            className="px-8"
          >
            {createList.isPending ? "Creating..." : "Create List"}
          </Button>
        </div>
      </div>
    </div>
  );
}