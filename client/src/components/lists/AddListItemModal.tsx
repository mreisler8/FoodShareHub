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

// Distance calculation utility
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
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
        const location = await LocationService.getInstance().getCurrentLocation();
        if (location) {
          setUserLocation(location);
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
                              {searchResults.map((restaurant: any) => {
                                // Calculate distance if user location is available
                                const distance = userLocation && restaurant.metadata?.coordinates ? 
                                  calculateDistance(
                                    userLocation.lat, userLocation.lng,
                                    restaurant.metadata.coordinates.lat, restaurant.metadata.coordinates.lng
                                  ) : null;

                                return (
                                  <Card key={restaurant.id} className="cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200 border-gray-200" onClick={() => {
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
                                      <div className="flex items-start space-x-4">
                                        {/* Enhanced Restaurant Image */}
                                        <div className="relative w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                          <UtensilsCrossed className="h-7 w-7 text-blue-600" />
                                          {restaurant.metadata?.source === 'google_places' && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                              <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 space-y-2">
                                          {/* Restaurant Name & Source */}
                                          <div className="flex items-start justify-between">
                                            <h3 className="font-semibold text-lg text-gray-900 leading-tight">{restaurant.name}</h3>
                                            <Plus className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                                          </div>
                                          
                                          {/* Location with Distance */}
                                          {restaurant.location && (
                                            <div className="flex items-center text-sm text-gray-600">
                                              <MapPin className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                              <span className="truncate">{restaurant.location}</span>
                                              {distance && (
                                                <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                                                  {distance.toFixed(1)}km
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* Metadata Row */}
                                          <div className="flex items-center gap-3 flex-wrap">
                                            {/* Cuisine Badge */}
                                            {restaurant.cuisine && (
                                              <Badge variant="outline" className="text-xs font-medium border-blue-200 text-blue-700 bg-blue-50">
                                                {restaurant.cuisine}
                                              </Badge>
                                            )}
                                            
                                            {/* Rating Display */}
                                            {restaurant.avgRating && (
                                              <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md">
                                                <Star className="h-3.5 w-3.5 text-amber-500 mr-1 fill-current" />
                                                <span className="text-sm font-semibold text-amber-700">
                                                  {restaurant.avgRating.toFixed(1)}
                                                </span>
                                                <span className="text-xs text-amber-600 ml-1">
                                                  ({restaurant.metadata?.source === 'google_places' ? 'Google' : 'Users'})
                                                </span>
                                              </div>
                                            )}
                                            
                                            {/* Price Range Indicator */}
                                            {restaurant.metadata?.priceLevel && (
                                              <div className="flex items-center text-sm text-gray-600">
                                                {Array.from({ length: 4 }, (_, i) => (
                                                  <span key={i} className={i < restaurant.metadata.priceLevel ? 'text-green-600' : 'text-gray-300'}>
                                                    $
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            
                                            {/* Operating Status */}
                                            {restaurant.metadata?.isOpen !== undefined && (
                                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                restaurant.metadata.isOpen 
                                                  ? 'bg-green-100 text-green-800' 
                                                  : 'bg-red-100 text-red-800'
                                              }`}>
                                                {restaurant.metadata.isOpen ? 'Open' : 'Closed'}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}

                          {searchQuery && !isSearching && (!searchResults || searchResults.length === 0) && (
                            <div className="text-center py-12 text-gray-500">
                              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UtensilsCrossed className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-700 mb-2">No restaurants found</h3>
                              <p className="text-sm text-gray-500 mb-4">
                                We couldn't find any restaurants matching "{searchQuery}"
                              </p>
                              <Button 
                                variant="outline" 
                                onClick={() => setShowManualEntry(true)}
                                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                              >
                                Add manually instead
                              </Button>
                            </div>
                          )}

                          {!searchQuery && (
                            <div className="text-center py-12 text-gray-500">
                              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-blue-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-700 mb-2">Find restaurants</h3>
                              <p className="text-sm text-gray-500 mb-4">
                                Start typing to search for restaurants near you
                              </p>
                              <Button 
                                variant="outline" 
                                onClick={() => setShowManualEntry(true)}
                                className="border-gray-200 text-gray-600 hover:bg-gray-50"
                              >
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
                          <div className="text-center py-8 text-muted-foreground">
                            <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="mb-2">First, search for a restaurant in the Restaurant tab</p>
                            <p className="text-sm">Then come back here to add a specific dish</p>
                          </div>
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