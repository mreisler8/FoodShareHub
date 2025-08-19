import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, X, Plus, Check, AlertCircle, Search, Loader2, UtensilsCrossed, Star } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { LocationService, type LocationData } from '@/services/locationService';
import { useEffect } from 'react';
import { SmartTagInput } from "./SmartTagInput";

const restaurantFormSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  city: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  photo: z.string().optional(),
});

const dishFormSchema = z.object({
  dishName: z.string().min(1, "Dish name is required"),
  restaurantName: z.string().min(1, "Restaurant name is required"),
  city: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  photo: z.string().optional(),
});

type RestaurantFormValues = z.infer<typeof restaurantFormSchema>;
type DishFormValues = z.infer<typeof dishFormSchema>;

export interface ListItemData {
  type: "restaurant" | "dish";
  restaurant?: {
    id?: number;
    name: string;
    location?: string;
    city?: string;
    googlePlaceId?: string | null; // Added to store Google Place ID
  };
  dish?: {
    name: string;
  };
  tags: string[];
  notes?: string;
  photo?: string;
}

interface AddListItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: ListItemData) => void;
}

export function AddListItemModal({ open, onOpenChange, onSave }: AddListItemModalProps) {
  const [itemType, setItemType] = useState<"restaurant" | "dish">("restaurant");
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedRestaurants, setAddedRestaurants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Initialize location services
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const permission = await LocationService.checkPermission();
        if (permission === 'granted') {
          const location = await LocationService.getCurrentLocation();
          if (location) {
            setUserLocation(location);
          }
        }
      } catch (error) {
        console.error('Location initialization error:', error);
      }
    };
    initializeLocation();
  }, []);
  
  // Enhanced restaurant search with location awareness
  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ["/api/search/unified", debouncedSearchQuery, userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim()) return null;
      
      const params = new URLSearchParams({
        q: debouncedSearchQuery
      });
      
      // Add location parameters for proximity-based results
      if (userLocation?.lat && userLocation?.lng) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', '10000'); // 10km radius
      }
      
      const response = await fetch(`/api/search/unified?${params.toString()}`);
      const data = await response.json();
      return data.results?.restaurants || [];
    },
    enabled: !!debouncedSearchQuery.trim()
  });
  
  const searchResults = searchData || [];

  const restaurantForm = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      name: "",
      city: "",
      tags: [],
      notes: "",
      photo: "",
    },
  });

  const dishForm = useForm<DishFormValues>({
    resolver: zodResolver(dishFormSchema),
    defaultValues: {
      dishName: "",
      restaurantName: "",
      city: "",
      tags: [],
      notes: "",
      photo: "",
    },
  });

  const handleRestaurantSelect = (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    if (itemType === "restaurant") {
      restaurantForm.setValue("name", restaurant.name);
      restaurantForm.setValue("city", restaurant.location || "");
    } else {
      dishForm.setValue("restaurantName", restaurant.name);
      dishForm.setValue("city", restaurant.location || "");
    }
    setShowManualEntry(false);
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleRestaurantSubmit = async (data: RestaurantFormValues) => {
    setIsSubmitting(true);
    try {
      const item: ListItemData = {
        type: "restaurant",
        restaurant: {
          id: selectedRestaurant?.id,
          name: data.name,
          location: data.city,
          city: data.city,
          googlePlaceId: selectedRestaurant?.googlePlaceId || null,
        },
        tags: selectedTags,
        notes: data.notes,
        photo: data.photo,
      };
      await onSave(item);
      setAddedCount(prev => prev + 1);
      setAddedRestaurants(prev => [...prev, data.name]);
      setShowSuccess(true);

      // Auto-hide success after 2 seconds and reset for next entry
      setTimeout(() => {
        setShowSuccess(false);
        resetFormForNext();
      }, 2000);
    } catch (error) {
      console.error("Failed to add restaurant:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDishSubmit = async (data: DishFormValues) => {
    setIsSubmitting(true);
    try {
      const item: ListItemData = {
        type: "dish",
        restaurant: {
          id: selectedRestaurant?.id,
          name: data.restaurantName,
          location: data.city,
          city: data.city,
          googlePlaceId: selectedRestaurant?.googlePlaceId || null,
        },
        dish: {
          name: data.dishName,
        },
        tags: selectedTags,
        notes: data.notes,
        photo: data.photo,
      };
      await onSave(item);
      setAddedCount(prev => prev + 1);
      setAddedRestaurants(prev => [...prev, `${data.dishName} at ${data.restaurantName}`]);
      setShowSuccess(true);

      // Auto-hide success after 2 seconds and reset for next entry
      setTimeout(() => {
        setShowSuccess(false);
        resetFormForNext();
      }, 2000);
    } catch (error) {
      console.error("Failed to add dish:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormForNext = () => {
    setSelectedRestaurant(null);
    setSelectedTags([]);
    setShowManualEntry(false);
    restaurantForm.reset();
    dishForm.reset();
  };

  const resetForm = () => {
    setItemType("restaurant");
    setSelectedRestaurant(null);
    setSelectedTags([]);
    setShowManualEntry(false);
    setShowSuccess(false);
    setCustomTag("");
    restaurantForm.reset();
    dishForm.reset();
  };

  const handleClose = () => {
    resetForm();
    setAddedCount(0);
    setAddedRestaurants([]);
    onOpenChange(false);
  };

  const handleContinueAdding = () => {
    setShowSuccess(false);
    resetFormForNext();
  };

  // Renamed `onAdd` to `onSave` to match the prop name
  const onAdd = (restaurantData: any) => {
    // This function is a placeholder and should be replaced by the actual onSave logic
    // or you can directly use `onSave` if its signature matches what's needed here.
    // For now, let's assume it maps to the ListItemData structure.

    const listItem: ListItemData = {
      type: "restaurant", // Assuming this modal is for restaurants for now
      restaurant: {
        googlePlaceId: restaurantData.googlePlaceId,
        name: restaurantData.name,
        location: restaurantData.location,
        city: restaurantData.city, // Assuming city can be derived from location if not explicit
      },
      tags: [], // Tags will be handled separately
      notes: restaurantData.notes,
    };
    onSave(listItem);
  };


  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-4 flex-shrink-0 border-b bg-white sticky top-0 z-10">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            🍽 What are you adding?
          </DialogTitle>
          {addedCount > 0 && (
            <div className="text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <Check className="h-4 w-4" />
              {addedCount} item{addedCount !== 1 ? 's' : ''} added to list
            </div>
          )}
        </DialogHeader>

        {/* Success State - Enhanced */}
        {showSuccess && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="text-center space-y-4 bg-white p-8 rounded-xl shadow-lg border border-green-200 max-w-md">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Check className="text-3xl text-green-600 h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-green-700">Added Successfully!</h3>
              <p className="text-base text-gray-700 font-medium">
                "{selectedRestaurant?.name || restaurantForm.getValues("name")}" is now in your list
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Recent additions:</p>
                <div className="mt-2 space-y-1">
                  {addedRestaurants.slice(-3).map((name, index) => (
                    <div key={index} className="text-xs text-gray-700 flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 w-full max-w-md">
              <Button 
                onClick={handleContinueAdding}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                + Add Another
              </Button>
              <Button 
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-2 border-gray-300 hover:bg-gray-50 font-semibold"
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Main Content - Scrollable */}
        {!showSuccess && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-1">
              <Tabs value={itemType} onValueChange={(value) => setItemType(value as "restaurant" | "dish")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 sticky top-0 bg-white z-10">
                  <TabsTrigger value="restaurant" className="flex items-center gap-2">
                    🏙 Restaurant
                  </TabsTrigger>
                  <TabsTrigger value="dish" className="flex items-center gap-2">
                    🍽 Dish @ Restaurant
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-6 pb-6">
                  <TabsContent value="restaurant" className="space-y-4 mt-0">
                    {!showManualEntry ? (
                      <div className="space-y-4">
                        {/* Inline Restaurant Search */}
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                            <Input
                              type="text"
                              placeholder="Search restaurants..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 h-12 text-base"
                            />
                          </div>

                          {/* Search Results */}
                          {isSearching && (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin" />
                              <span className="ml-2">Searching restaurants...</span>
                            </div>
                          )}

                          {searchResults && searchResults.length > 0 && (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                              <p className="text-sm text-muted-foreground">
                                Found {searchResults.length} restaurant{searchResults.length !== 1 ? 's' : ''}
                              </p>
                              {searchResults.map((restaurant: any) => (
                                <Card key={restaurant.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => {
                                  const restaurantData = {
                                    id: restaurant.metadata?.googlePlaceId || restaurant.id,
                                    googlePlaceId: restaurant.metadata?.googlePlaceId || (restaurant.id?.toString().startsWith('ChIJ') ? restaurant.id : null),
                                    name: restaurant.name,
                                    location: restaurant.location || restaurant.subtitle,
                                    category: restaurant.cuisine || 'Restaurant',
                                    rating: restaurant.avgRating,
                                    source: restaurant.metadata?.source || 'database'
                                  };
                                  handleRestaurantSelect(restaurantData);
                                  setSearchQuery(""); // Clear search after selection
                                }}>
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-4">
                                      {/* Restaurant Image Placeholder */}
                                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <UtensilsCrossed className="h-6 w-6 text-gray-400" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base">{restaurant.name}</h3>
                                        {restaurant.location && (
                                          <p className="text-sm text-muted-foreground flex items-center mt-1">
                                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">{restaurant.location}</span>
                                          </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                          {restaurant.cuisine && (
                                            <Badge variant="outline" className="text-xs">
                                              {restaurant.cuisine}
                                            </Badge>
                                          )}
                                          {restaurant.avgRating && (
                                            <div className="flex items-center text-sm text-amber-600">
                                              <Star className="h-3 w-3 text-amber-500 mr-1 fill-current" />
                                              {restaurant.avgRating.toFixed(1)}
                                            </div>
                                          )}
                                          {restaurant.metadata?.source === 'google_places' && (
                                            <Badge variant="secondary" className="text-xs">
                                              Google Places
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <Plus className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {searchQuery && !isSearching && (!searchResults || searchResults.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="mb-2">No restaurants found for "{searchQuery}"</p>
                              <Button variant="outline" onClick={() => setShowManualEntry(true)}>
                                Add manually instead
                              </Button>
                            </div>
                          )}

                          {!searchQuery && (
                            <div className="text-center py-8 text-muted-foreground">
                              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="mb-2">Start typing to search restaurants</p>
                              <Button variant="outline" onClick={() => setShowManualEntry(true)}>
                                Or add manually
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Selected Restaurant Preview */}
                        {selectedRestaurant && (
                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <UtensilsCrossed className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <h5 className="font-semibold text-green-900">{selectedRestaurant.name}</h5>
                                    {selectedRestaurant.location && (
                                      <p className="text-sm text-green-700 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {selectedRestaurant.location}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedRestaurant(null)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Form {...restaurantForm}>
                          <form onSubmit={restaurantForm.handleSubmit(handleRestaurantSubmit)} className="space-y-4">
                            <FormField
                              control={restaurantForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Restaurant Name *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Joe's Pizza" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={restaurantForm.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Location</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Toronto, ON" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={restaurantForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes (optional)</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Why do you recommend this place?" rows={3} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Enhanced Custom Tags Section */}
                            <div className="space-y-3">
                              <label className="text-sm font-medium">Tags</label>

                              {/* Selected Tags Display */}
                              {selectedTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {selectedTags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
                                      {tag}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="h-auto p-0 hover:bg-transparent"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Custom Tag Input */}
                              <div className="flex gap-2">
                                <Input
                                  value={customTag}
                                  onChange={(e) => setCustomTag(e.target.value)}
                                  placeholder="Add custom tag..."
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddCustomTag();
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  onClick={handleAddCustomTag}
                                  disabled={!customTag.trim() || selectedTags.includes(customTag.trim())}
                                  size="sm"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Quick Tag Suggestions */}
                              <div className="flex flex-wrap gap-1">
                                {[
                                  "casual", "fine-dining", "romantic", "family-friendly", 
                                  "quick-bite", "brunch", "date-night", "business-lunch",
                                  "spicy", "vegetarian", "vegan", "seafood", "steakhouse",
                                  "pizza", "sushi", "italian", "mexican", "asian", "american"
                                ].filter(tag => !selectedTags.includes(tag)).slice(0, 6).map((tag) => (
                                  <Button
                                    key={tag}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedTags(prev => [...prev, tag])}
                                    className="h-7 px-2 text-xs"
                                  >
                                    + {tag}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowManualEntry(false)}
                                className="flex-1"
                              >
                                Back to Search
                              </Button>
                              <Button 
                                type="submit" 
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? "Adding..." : "Add Restaurant"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    )}

                    {selectedRestaurant && !showManualEntry && (
                      <Form {...restaurantForm}>
                        <form onSubmit={restaurantForm.handleSubmit(handleRestaurantSubmit)} className="space-y-4">
                          <FormField
                            control={restaurantForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (optional)</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Why do you recommend this place?" rows={3} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Enhanced Custom Tags Section for Selected Restaurant */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Tags</label>

                            {/* Selected Tags Display */}
                            {selectedTags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {selectedTags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="gap-1">
                                    {tag}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveTag(tag)}
                                      className="h-auto p-0 hover:bg-transparent"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Custom Tag Input */}
                            <div className="flex gap-2">
                              <Input
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                placeholder="Add custom tag..."
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomTag();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                onClick={handleAddCustomTag}
                                disabled={!customTag.trim() || selectedTags.includes(customTag.trim())}
                                size="sm"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Smart Tag Suggestions */}
                            <SmartTagInput
                              selectedTags={selectedTags}
                              onTagsChange={setSelectedTags}
                              maxTags={8}
                              allowCustomTags={true}
                              contextRestaurants={selectedRestaurant ? [{ cuisine: selectedRestaurant.category, location: selectedRestaurant.location }] : []}
                            />
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Adding Restaurant..." : "Add Restaurant"}
                          </Button>
                        </form>
                      </Form>
                    )}
                  </TabsContent>

                  <TabsContent value="dish" className="space-y-4 mt-0">
                    {!showManualEntry ? (
                      <div className="space-y-4">
                        {!selectedRestaurant ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            onClick={() => setSearchModalOpen(true)}
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Search for the restaurant...
                          </Button>
                        ) : null}

                        {selectedRestaurant && (
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium">{selectedRestaurant.name}</h5>
                                  {selectedRestaurant.location && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {selectedRestaurant.location}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedRestaurant(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowManualEntry(true)}
                          className="w-full"
                        >
                          Can't find restaurant? Add manually
                        </Button>
                      </div>
                    ) : null}

                    {(selectedRestaurant || showManualEntry) && (
                      <Form {...dishForm}>
                        <form onSubmit={dishForm.handleSubmit(handleDishSubmit)} className="space-y-4">
                          <FormField
                            control={dishForm.control}
                            name="dishName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dish Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Margherita Pizza" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {showManualEntry && (
                            <>
                              <FormField
                                control={dishForm.control}
                                name="restaurantName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Restaurant Name *</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g., Joe's Pizza" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={dishForm.control}
                                name="city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Location</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g., Toronto, ON" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          <FormField
                            control={dishForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (optional)</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="What makes this dish special?" rows={3} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Enhanced Custom Tags Section for Dishes */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Tags</label>

                            {/* Selected Tags Display */}
                            {selectedTags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {selectedTags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="gap-1">
                                    {tag}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveTag(tag)}
                                      className="h-auto p-0 hover:bg-transparent"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Custom Tag Input */}
                            <div className="flex gap-2">
                              <Input
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                placeholder="Add custom tag..."
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomTag();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                onClick={handleAddCustomTag}
                                disabled={!customTag.trim() || selectedTags.includes(customTag.trim())}
                                size="sm"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Smart Tag Suggestions */}
                            <SmartTagInput
                              selectedTags={selectedTags}
                              onTagsChange={setSelectedTags}
                              maxTags={8}
                              allowCustomTags={true}
                              contextRestaurants={selectedRestaurant ? [{ cuisine: selectedRestaurant.category, location: selectedRestaurant.location }] : []}
                            />
                          </div>

                          <div className="flex gap-3 pt-4">
                            {showManualEntry && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowManualEntry(false)}
                                className="flex-1"
                              >
                                Back to Search
                              </Button>
                            )}
                            <Button 
                              type="submit" 
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? "Adding Dish..." : "Add Dish"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>


  </>
);
}