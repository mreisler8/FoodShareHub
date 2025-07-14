import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CircleWithStats } from "@/lib/types";
import { Search, Plus, ArrowUp, ArrowDown, X, Star, MapPin, Tag, Users, Globe, ChevronDown, ChevronUp } from "lucide-react";

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
  shareWithCircle: z.boolean().default(false),
  makePublic: z.boolean().default(false),
  circleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ListItem {
  id: string;
  name: string;
  type: "restaurant" | "dish";
  restaurant?: string;
  notes?: string;
  rating?: number;
  priceRange?: string;
  tags?: string[];
  location?: string;
  position: number;
}

interface SearchResult {
  id: string;
  name: string;
  type: "restaurant" | "dish";
  restaurant?: string;
  location?: string;
  rating?: number;
  priceRange?: string;
  cuisine?: string;
}

// List Item Component with simple up/down controls
function ListItemComponent({ 
  item, 
  onUpdate, 
  onRemove, 
  onMoveUp, 
  onMoveDown, 
  canMoveUp, 
  canMoveDown,
  index 
}: { 
  item: ListItem; 
  onUpdate: (id: string, updates: Partial<ListItem>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  index: number;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-gray-700 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
              {index + 1}
            </span>
            <div className="flex flex-col mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMoveUp(item.id)}
                disabled={!canMoveUp}
                className="h-6 w-6 p-0"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMoveDown(item.id)}
                disabled={!canMoveDown}
                className="h-6 w-6 p-0"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900">{item.name}</h3>
              <Badge variant={item.type === "restaurant" ? "default" : "secondary"}>
                {item.type}
              </Badge>
            </div>
            
            {item.restaurant && item.type === "dish" && (
              <p className="text-sm text-gray-600 mt-1">at {item.restaurant}</p>
            )}
            
            {item.location && (
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                {item.location}
              </p>
            )}
            
            {item.notes && !showDetails && (
              <p className="text-sm text-gray-700 mt-2 line-clamp-2">{item.notes}</p>
            )}
            
            {item.rating && (
              <div className="flex items-center mt-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${i < item.rating! ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 ml-2">{item.rating}/5</span>
              </div>
            )}
            
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div>
            <Label htmlFor={`notes-${item.id}`}>Notes & Commentary</Label>
            <Textarea
              id={`notes-${item.id}`}
              placeholder="Add your thoughts, what you loved, must-try dishes, recommendations..."
              value={item.notes || ""}
              onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`rating-${item.id}`}>Your Rating</Label>
              <Select
                value={item.rating?.toString() || ""}
                onValueChange={(value) => onUpdate(item.id, { rating: value ? parseInt(value) : undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rate this item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">⭐ Poor</SelectItem>
                  <SelectItem value="2">⭐⭐ Fair</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ Good</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ Very Good</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor={`price-${item.id}`}>Price Range</Label>
              <Select
                value={item.priceRange || ""}
                onValueChange={(value) => onUpdate(item.id, { priceRange: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Price range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$">$ - Budget-friendly</SelectItem>
                  <SelectItem value="$$">$$ - Moderate</SelectItem>
                  <SelectItem value="$$$">$$$ - Upscale</SelectItem>
                  <SelectItem value="$$$$">$$$$ - Fine dining</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor={`tags-${item.id}`}>Tags</Label>
            <Input
              id={`tags-${item.id}`}
              placeholder="e.g., vegetarian, spicy, date night, family-friendly"
              value={item.tags?.join(", ") || ""}
              onChange={(e) => onUpdate(item.id, { 
                tags: e.target.value.split(",").map(t => t.trim()).filter(t => t) 
              })}
              className="mt-1"
            />
          </div>
          
          {item.type === "dish" && (
            <div>
              <Label htmlFor={`restaurant-${item.id}`}>Restaurant</Label>
              <Input
                id={`restaurant-${item.id}`}
                placeholder="Which restaurant serves this dish?"
                value={item.restaurant || ""}
                onChange={(e) => onUpdate(item.id, { restaurant: e.target.value })}
                className="mt-1"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [items, setItems] = useState<ListItem[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Fetch circles for sharing options
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
  
  // Search functionality
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await apiRequest("GET", `/api/search/unified?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      // Transform search results to our format
      const results: SearchResult[] = [
        ...(data.restaurants || []).map((r: any) => ({
          id: `restaurant-${r.id || r.place_id}`,
          name: r.name,
          type: "restaurant" as const,
          location: r.address || r.location,
          rating: r.rating || r.avgRating,
          priceRange: r.price_level ? "$".repeat(r.price_level) : undefined,
          cuisine: r.cuisine,
        })),
        // Add sample dishes when searching for food terms
        ...(query.toLowerCase().includes("pizza") ? [
          {
            id: "dish-margherita",
            name: "Margherita Pizza",
            type: "dish" as const,
            restaurant: "Various locations",
          },
          {
            id: "dish-pepperoni",
            name: "Pepperoni Pizza",
            type: "dish" as const,
            restaurant: "Various locations",
          }
        ] : []),
        ...(query.toLowerCase().includes("burger") ? [
          {
            id: "dish-classic-burger",
            name: "Classic Burger",
            type: "dish" as const,
            restaurant: "Various locations",
          }
        ] : []),
        ...(query.toLowerCase().includes("pasta") ? [
          {
            id: "dish-carbonara",
            name: "Spaghetti Carbonara",
            type: "dish" as const,
            restaurant: "Various locations",
          }
        ] : []),
      ];
      
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);
  
  // Add item to list
  const addItem = (searchResult: SearchResult) => {
    const newItem: ListItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: searchResult.name,
      type: searchResult.type,
      restaurant: searchResult.restaurant,
      location: searchResult.location,
      rating: searchResult.rating ? Math.round(searchResult.rating) : undefined,
      priceRange: searchResult.priceRange,
      position: items.length,
      notes: "",
      tags: searchResult.cuisine ? [searchResult.cuisine] : [],
    };
    
    setItems([...items, newItem]);
    setSearchQuery("");
    setSearchResults([]);
    
    toast({
      title: "Added to list!",
      description: `${newItem.name} has been added to your list`,
    });
  };
  
  // Update item
  const updateItem = (id: string, updates: Partial<ListItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };
  
  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  // Move item up
  const moveItemUp = (id: string) => {
    const index = items.findIndex(item => item.id === id);
    if (index > 0) {
      const newItems = [...items];
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
      setItems(newItems.map((item, i) => ({ ...item, position: i })));
    }
  };
  
  // Move item down
  const moveItemDown = (id: string) => {
    const index = items.findIndex(item => item.id === id);
    if (index < items.length - 1) {
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      setItems(newItems.map((item, i) => ({ ...item, position: i })));
    }
  };
  
  // Create list mutation
  const createList = useMutation({
    mutationFn: async (values: FormValues) => {
      const tags = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      
      const payload = {
        name: values.name,
        description: values.description || "",
        tags: tags,
        type: "restaurant",
        audience: values.makePublic ? "public" : "profile",
        isPublic: values.makePublic,
        visibility: {
          public: values.makePublic,
          followers: false,
          circleIds: values.shareWithCircle && values.circleId ? [parseInt(values.circleId)] : [],
        },
        items: items.map(item => ({
          name: item.name,
          notes: item.notes || "",
          rating: item.rating,
          priceAssessment: item.priceRange === "$" ? "Great value" : 
                          item.priceRange === "$$" ? "Fair" : 
                          item.priceRange === "$$$" || item.priceRange === "$$$$" ? "Overpriced" : undefined,
          tags: item.tags || [],
          city: item.location || "",
          rank: item.position + 1,
          liked: item.notes && item.rating && item.rating >= 4 ? item.notes : undefined,
          mustTryDishes: item.type === "dish" ? [item.name] : [],
        })),
      };
      
      console.log("Creating list with payload:", payload);
      const response = await apiRequest("POST", "/api/lists", payload);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create list");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "Success!",
        description: "Your restaurant list has been created successfully.",
      });
      
      const listId = data?.id;
      if (listId) {
        navigate(`/lists/${listId}`);
      } else {
        navigate("/lists");
      }
    },
    onError: (error: any) => {
      console.error("Create list error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create restaurant list. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    if (items.length === 0) {
      toast({
        title: "No items added",
        description: "Please add at least one restaurant or dish to your list.",
        variant: "destructive",
      });
      return;
    }
    
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
      <MobileNavigation />
      <DesktopSidebar />
      
      <div className="flex-1 max-w-6xl mx-auto px-4 py-6 md:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New List</h1>
          <p className="text-gray-600">Curate and rank your favorite restaurants and dishes</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List Settings */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  List Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>List Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Best Pizza Places" {...field} />
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
                              placeholder="Tell people what makes this list special..." 
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
                          <FormLabel>Tags (comma-separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., pizza, casual, family-friendly" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-3">
                      <Label>Sharing Options</Label>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="makePublic"
                          checked={form.watch("makePublic")}
                          onCheckedChange={(checked) => form.setValue("makePublic", !!checked)}
                        />
                        <Label htmlFor="makePublic" className="flex items-center cursor-pointer">
                          <Globe className="h-4 w-4 mr-2" />
                          Make Public
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="shareWithCircle"
                          checked={form.watch("shareWithCircle")}
                          onCheckedChange={(checked) => form.setValue("shareWithCircle", !!checked)}
                        />
                        <Label htmlFor="shareWithCircle" className="flex items-center cursor-pointer">
                          <Users className="h-4 w-4 mr-2" />
                          Share with Circle
                        </Label>
                      </div>
                      
                      {form.watch("shareWithCircle") && (
                        <FormField
                          control={form.control}
                          name="circleId"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Select {...field} onValueChange={field.onChange}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select circle" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {circles?.map((circle) => (
                                      <SelectItem key={circle.id} value={circle.id.toString()}>
                                        {circle.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createList.isPending || items.length === 0}
                    >
                      {createList.isPending ? "Creating List..." : `Create List (${items.length} items)`}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          {/* Search and Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Search & Add Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search for restaurants, dishes, or food..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {isSearching && (
                  <div className="mt-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2">Searching...</p>
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{result.name}</span>
                            <Badge variant={result.type === "restaurant" ? "default" : "secondary"}>
                              {result.type}
                            </Badge>
                          </div>
                          {result.location && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {result.location}
                            </p>
                          )}
                          {result.restaurant && result.type === "dish" && (
                            <p className="text-sm text-gray-600 mt-1">at {result.restaurant}</p>
                          )}
                          {result.rating && (
                            <div className="flex items-center mt-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                              <span className="text-sm text-gray-600">{result.rating}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(result)}
                          className="ml-3"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchQuery && !isSearching && searchResults.length === 0 && (
                  <div className="mt-4 text-center text-gray-500">
                    <p>No results found for "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try searching for restaurants or dishes</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Items List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="mr-2">Your Ranked List</span>
                    <Badge variant="outline">{items.length} items</Badge>
                  </div>
                  {items.length > 0 && (
                    <span className="text-sm text-gray-500">
                      Use ↑↓ to reorder
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No items added yet</h3>
                    <p>Search and add restaurants or dishes above to start building your list</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <ListItemComponent
                        key={item.id}
                        item={item}
                        index={index}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                        onMoveUp={moveItemUp}
                        onMoveDown={moveItemDown}
                        canMoveUp={index > 0}
                        canMoveDown={index < items.length - 1}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}