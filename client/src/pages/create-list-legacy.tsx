import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Search, Plus, Star, ArrowLeft, ArrowRight } from "lucide-react";
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
      
      // Clear form and draft
      form.reset();
      setListItems([]);
      localStorage.removeItem('draft-list');
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
  const watchedDescription = form.watch("description");

  // Smart description suggestions based on restaurants added
  const generateSmartDescription = () => {
    if (listItems.length === 0) return "";
    
    const cuisines = [...new Set(listItems.map(item => item.restaurant.category))];
    const locations = [...new Set(listItems.map(item => item.restaurant.location.split(',')[0]))];
    
    if (cuisines.length === 1) {
      return `My favorite ${cuisines[0].toLowerCase()} spots`;
    } else if (locations.length === 1) {
      return `Best restaurants in ${locations[0]}`;
    } else if (listItems.length <= 3) {
      return "A curated selection of my go-to restaurants";
    } else {
      return "My comprehensive guide to great dining";
    }
  };
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    createList.mutate(values);
  };
  
  // Auto-save draft to localStorage
  useEffect(() => {
    const formData = form.watch();
    if (formData.name || formData.description || formData.tags || listItems.length > 0) {
      localStorage.setItem('draft-list', JSON.stringify({
        formData,
        listItems,
        timestamp: Date.now()
      }));
    }
  }, [form.watch, listItems]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('draft-list');
    if (draft) {
      try {
        const { formData, listItems: draftItems, timestamp } = JSON.parse(draft);
        // Only load if draft is less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          if (formData.name || formData.description || formData.tags) {
            form.reset(formData);
          }
          if (draftItems && draftItems.length > 0) {
            setListItems(draftItems);
          }
        }
      } catch (error) {
        console.log('Failed to load draft:', error);
      }
    }
  }, []);

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

        {/* Step-Based Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Create Your List</h2>
            <span className="text-sm text-muted-foreground">
              Step {activeTab === 'details' ? '1' : activeTab === 'restaurants' ? '2' : '3'} of 3
            </span>
          </div>
          
          {/* Step Navigation */}
          <div className="flex items-center space-x-4 mb-6">
            {[
              { key: 'details', label: 'List Basics', icon: Utensils, completed: watchedName },
              { key: 'restaurants', label: 'Add Items', icon: Search, completed: listItems.length > 0 },
              { key: 'ranking', label: 'Share', icon: Star, completed: false }
            ].map((step, index) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => setActiveTab(step.key)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === step.key 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : step.completed 
                        ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{step.label}</span>
                  {step.completed && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                </button>
                {index < 2 && (
                  <div className={`w-8 h-0.5 mx-2 ${step.completed ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {activeTab === 'details' && (
            <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">List Basics</h2>
                <p className="text-sm text-muted-foreground">Start with just one place or dish — you can always edit later.</p>
              </div>
                  <Form {...form}>
                    <div className="space-y-6">
                      {/* Quick Templates */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700">Quick Templates</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[
                            { name: "Best Pizza Places", desc: "Top pizza spots", emoji: "🍕" },
                            { name: "Date Night Favorites", desc: "Romantic dining", emoji: "❤️" },
                            { name: "Hidden Gems", desc: "Underrated places", emoji: "💎" },
                            { name: "Weekend Brunch", desc: "Perfect for brunch", emoji: "🥞" },
                            { name: "Work Lunch Options", desc: "Quick lunch spots", emoji: "💼" },
                            { name: "Family Friendly", desc: "Great for families", emoji: "👨‍👩‍👧‍👦" }
                          ].map((template) => (
                            <button
                              key={template.name}
                              type="button"
                              className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                form.setValue('name', template.name);
                                form.setValue('description', template.desc);
                              }}
                            >
                              <div className="text-lg mb-1">{template.emoji}</div>
                              <div className="text-sm font-medium">{template.name}</div>
                              <div className="text-xs text-gray-500">{template.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

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
                              <div>
                                <Textarea 
                                  placeholder="Describe your list (optional)" 
                                  className="min-h-24" 
                                  {...field} 
                                />
                                {!field.value && listItems.length > 0 && (
                                  <button
                                    type="button"
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                    onClick={() => field.onChange(generateSmartDescription())}
                                  >
                                    ✨ Generate smart description
                                  </button>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Enhanced Tags Section */}
                      <div className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                            <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                            Add Tags
                          </h3>
                          <p className="text-xs text-gray-600">Help others discover your list with relevant tags</p>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <div className="space-y-4">
                                {/* Categorized Quick Tags */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Popular</p>
                                    <div className="flex flex-wrap gap-1">
                                      {['trending', 'must-try', 'hidden-gem', 'local-favorite'].map((tag) => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => {
                                            const currentTags = field.value ? field.value.split(',').map(t => t.trim()).filter(Boolean) : [];
                                            if (!currentTags.includes(tag)) {
                                              const newTags = [...currentTags, tag].join(', ');
                                              field.onChange(newTags);
                                            }
                                          }}
                                          className="px-2.5 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg border border-blue-200 transition-all hover:scale-105"
                                        >
                                          + {tag}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Occasion</p>
                                    <div className="flex flex-wrap gap-1">
                                      {['date-night', 'family-friendly', 'brunch', 'late-night'].map((tag) => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => {
                                            const currentTags = field.value ? field.value.split(',').map(t => t.trim()).filter(Boolean) : [];
                                            if (!currentTags.includes(tag)) {
                                              const newTags = [...currentTags, tag].join(', ');
                                              field.onChange(newTags);
                                            }
                                          }}
                                          className="px-2.5 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded-lg border border-green-200 transition-all hover:scale-105"
                                        >
                                          + {tag}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Budget</p>
                                    <div className="flex flex-wrap gap-1">
                                      {['cheap-eats', 'mid-range', 'splurge-worthy'].map((tag) => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => {
                                            const currentTags = field.value ? field.value.split(',').map(t => t.trim()).filter(Boolean) : [];
                                            if (!currentTags.includes(tag)) {
                                              const newTags = [...currentTags, tag].join(', ');
                                              field.onChange(newTags);
                                            }
                                          }}
                                          className="px-2.5 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg border border-orange-200 transition-all hover:scale-105"
                                        >
                                          + {tag}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="border-t border-gray-300 pt-3">
                                  <FormControl>
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium text-gray-700">Custom tags:</Label>
                                      <Input
                                        placeholder="Type your own tags (comma-separated)"
                                        {...field}
                                        className="text-sm bg-white border-gray-300 focus:border-primary"
                                      />
                                    </div>
                                  </FormControl>
                                </div>
                                
                                {/* Current Tags Display */}
                                {field.value && field.value.trim() && (
                                  <div className="space-y-2 bg-white p-3 rounded-lg border border-gray-200">
                                    <p className="text-xs font-medium text-gray-700">Selected tags:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {field.value.split(',').map(tag => tag.trim()).filter(Boolean).map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                          {tag}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newTags = field.value.split(',').map(t => t.trim()).filter(t => t !== tag).join(', ');
                                              field.onChange(newTags);
                                            }}
                                            className="ml-1.5 hover:text-red-600 transition-colors"
                                          >
                                            ×
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
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
                  
                  {/* Quick Actions */}
                  <div className="flex justify-between pt-4 border-t">
                    <div />
                    <Button 
                      onClick={() => setActiveTab('restaurants')}
                      disabled={!watchedName.trim()}
                      className="flex items-center space-x-2"
                    >
                      <span>Next: Add Items</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

          {/* Step 2: Add Items */}
          {activeTab === 'restaurants' && (
                <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-foreground">Add Your Favorite Places</h2>
                    <p className="text-sm text-muted-foreground">Tell us what made it memorable! Search for restaurants or add them manually.</p>
                  </div>
                  
                  <RestaurantSearchAndAdd 
                    onAddRestaurant={handleAddRestaurant} 
                    addedRestaurants={listItems.map(item => item.restaurant)}
                  />
                  
                  {/* Quick Actions */}
                  <div className="flex justify-between pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('details')}
                      className="flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back: List Basics</span>
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('ranking')}
                      disabled={listItems.length === 0}
                      className="flex items-center space-x-2"
                    >
                      <span>Next: Share & Finalize</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

          {/* Step 3: Share & Finalize */}
          {activeTab === 'ranking' && (
                <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-foreground">Share & Finalize</h2>
                    <p className="text-sm text-muted-foreground">
                      {listItems.length === 0 ? "Add restaurants first to finalize your list" : `Review and share your ${listItems.length} restaurant${listItems.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>

                  {listItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No restaurants added yet</p>
                      <p className="text-xs mt-1">Go back to add some restaurants first</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Share Destination with Icons */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground">Share Destination</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => form.setValue('audience', 'profile')}
                            className={`p-4 border rounded-lg text-left transition-all ${
                              watchedAudience === 'profile' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                👤
                              </div>
                              <div>
                                <div className="font-medium text-sm">Private</div>
                                <div className="text-xs text-muted-foreground">Only me</div>
                              </div>
                            </div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => form.setValue('audience', 'circle')}
                            className={`p-4 border rounded-lg text-left transition-all ${
                              watchedAudience === 'circle' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                🫶
                              </div>
                              <div>
                                <div className="font-medium text-sm">Circle</div>
                                <div className="text-xs text-muted-foreground">My circles only</div>
                              </div>
                            </div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => form.setValue('audience', 'public')}
                            className={`p-4 border rounded-lg text-left transition-all ${
                              watchedAudience === 'public' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                🔒
                              </div>
                              <div>
                                <div className="font-medium text-sm">Public</div>
                                <div className="text-xs text-muted-foreground">Everyone</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* List Preview */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground">Your List Preview</h3>
                        <DraggableRestaurantList 
                          items={listItems}
                          onItemsChange={handleItemsChange}
                          onRemoveItem={handleRemoveItem}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Final Actions */}
                  <div className="flex justify-between pt-6 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('restaurants')}
                      className="flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back: Add Items</span>
                    </Button>
                    <div className="text-center">
                      {!watchedName.trim() && (
                        <p className="text-sm text-muted-foreground mb-3">Add a list name to continue</p>
                      )}
                      {watchedName.trim() && listItems.length === 0 && (
                        <p className="text-sm text-muted-foreground mb-3">Consider adding restaurants to make your list more valuable</p>
                      )}
                      <Button 
                        onClick={() => form.handleSubmit(onSubmit)()}
                        disabled={createList.isPending || !watchedName.trim() || !watchedAudience}
                        size="lg"
                        className="px-8"
                      >
                        {createList.isPending ? "Creating..." : "Create List"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
        </div>


      </div>
    </div>
  );
}