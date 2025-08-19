import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  X,
  UtensilsCrossed,
  Star,
  MapPin,
  CheckCircle,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
// import SmartTagInput from "./SmartTagInput";

// Schema definitions
const restaurantFormSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  city: z.string().optional(),
  notes: z.string().optional(),
});

const dishFormSchema = z.object({
  dishName: z.string().min(1, "Dish name is required"),
  restaurantName: z.string().min(1, "Restaurant name is required"),
  city: z.string().optional(),
  notes: z.string().optional(),
});

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  category?: string;
  rating?: number;
  priceLevel?: number;
  photos?: string[];
  googlePlaceId?: string;
  distance?: number;
}

interface AddListItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: any) => void;
  list: { id: string; name: string } | null;
}

export function AddListItemModal({
  isOpen,
  onClose,
  onAddItem,
  list,
}: AddListItemModalProps) {
  const [itemType, setItemType] = useState<"restaurant" | "dish">("restaurant");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const restaurantForm = useForm<z.infer<typeof restaurantFormSchema>>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      name: "",
      city: "",
      notes: "",
    },
  });

  const dishForm = useForm<z.infer<typeof dishFormSchema>>({
    resolver: zodResolver(dishFormSchema),
    defaultValues: {
      dishName: "",
      restaurantName: selectedRestaurant?.name || "",
      city: selectedRestaurant?.location || "",
      notes: "",
    },
  });

  // Search restaurants query
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useQuery<{ restaurants?: Restaurant[] }>({
    queryKey: ["/api/search/unified", searchQuery, "restaurants"],
    enabled: !!searchQuery && searchQuery.length > 2,
    staleTime: 30000,
  });

  const restaurants = searchResults?.restaurants || [];

  useEffect(() => {
    if (selectedRestaurant?.name) {
      dishForm.setValue("restaurantName", selectedRestaurant.name);
      dishForm.setValue("city", selectedRestaurant.location || "");
    }
  }, [selectedRestaurant, dishForm]);

  const handleAddRestaurant = (restaurant: Restaurant) => {
    if (restaurant?.name) {
      setSelectedRestaurant(restaurant);
      restaurantForm.setValue("name", restaurant.name);
      restaurantForm.setValue("city", restaurant.location || "");
    }
  };

  const handleRestaurantSubmit = async (values: z.infer<typeof restaurantFormSchema>) => {
    setIsSubmitting(true);
    try {
      const item = {
        type: "restaurant",
        name: values.name,
        city: values.city,
        notes: values.notes,
        tags: selectedTags,
        restaurant: selectedRestaurant,
      };
      onAddItem(item);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        // Reset form
        restaurantForm.reset();
        setSelectedRestaurant(null);
        setSelectedTags([]);
        setSearchQuery("");
        setShowManualEntry(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add restaurant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDishSubmit = async (values: z.infer<typeof dishFormSchema>) => {
    setIsSubmitting(true);
    try {
      const item = {
        type: "dish",
        dishName: values.dishName,
        restaurantName: values.restaurantName,
        city: values.city,
        notes: values.notes,
        tags: selectedTags,
        restaurant: selectedRestaurant,
      };
      onAddItem(item);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        // Reset form
        dishForm.reset();
        setSelectedRestaurant(null);
        setSelectedTags([]);
        setSearchQuery("");
        setShowManualEntry(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add dish. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleClose = () => {
    setShowSuccess(false);
    onClose();
    // Reset all state
    restaurantForm.reset();
    dishForm.reset();
    setSelectedRestaurant(null);
    setSelectedTags([]);
    setSearchQuery("");
    setShowManualEntry(false);
    setItemType("restaurant");
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0 overflow-hidden bg-white border-0 shadow-2xl">
        {/* Stunning Gradient Header */}
        <DialogHeader className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <DialogTitle className="text-3xl font-bold mb-2">
              Add to "{list?.name || 'List'}"
            </DialogTitle>
            <p className="text-blue-100 text-lg">
              Discover and add amazing restaurants or dishes to your curated list
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full transform -translate-x-12 translate-y-12"></div>
        </DialogHeader>

        {/* Success State */}
        {showSuccess && (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 py-16">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Check className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-green-800 mb-2">Added Successfully!</h3>
                <p className="text-lg text-green-600">
                  Your {itemType} has been added to "{list.name}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Main Content */}
        {!showSuccess && (
          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto">
              <Tabs value={itemType} onValueChange={(value) => setItemType(value as "restaurant" | "dish")} className="w-full">
                {/* Modern Tab Navigation */}
                <div className="bg-gray-50 px-8 py-4 border-b border-gray-200">
                  <TabsList className="grid w-full max-w-md grid-cols-2 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                    <TabsTrigger 
                      value="restaurant" 
                      className="flex items-center gap-3 py-3 px-6 rounded-lg text-base font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                    >
                      <UtensilsCrossed className="h-5 w-5" />
                      Restaurant
                    </TabsTrigger>
                    <TabsTrigger 
                      value="dish" 
                      className="flex items-center gap-3 py-3 px-6 rounded-lg text-base font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                    >
                      <Star className="h-5 w-5" />
                      Specific Dish
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Enhanced Content Area */}
                <div className="px-8 py-6">
                  <TabsContent value="restaurant" className="space-y-6 mt-0">
                    {!showManualEntry ? (
                      <div className="space-y-6">
                        {/* Enhanced Search Section */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                          <div className="space-y-4">
                            <div className="text-center space-y-2">
                              <h3 className="text-xl font-bold text-gray-900">Find Your Restaurant</h3>
                              <p className="text-gray-600">Search from thousands of restaurants and add them to your list</p>
                            </div>
                            
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <Search className="h-6 w-6 text-blue-500" />
                              </div>
                              <Input
                                type="text"
                                placeholder="Type restaurant name, cuisine, or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-16 h-16 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 shadow-sm"
                              />
                              {searchQuery && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSearchQuery("")}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Search Results */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 min-h-[400px]">
                          {isSearching && (
                            <div className="flex items-center justify-center py-12">
                              <div className="text-center space-y-4">
                                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                                <p className="text-lg font-medium text-gray-600">Searching restaurants...</p>
                                <p className="text-sm text-gray-500">Finding the best matches for "{searchQuery}"</p>
                              </div>
                            </div>
                          )}

                          {!isSearching && restaurants && restaurants.length > 0 && (
                            <div className="p-6">
                              <div className="mb-6 text-center">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Found {restaurants.length} restaurants</h3>
                                <p className="text-gray-600">Click the + button to add a restaurant to your list</p>
                              </div>
                              
                              <div className="space-y-4 max-h-80 overflow-y-auto">
                                {restaurants.map((restaurant: Restaurant) => (
                                  <Card key={restaurant.id} className="group border-2 border-gray-100 hover:border-blue-300 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] rounded-xl">
                                    <CardContent className="p-5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                                          {/* Large Restaurant Image */}
                                          <div className="relative w-24 h-24 flex-shrink-0">
                                            {restaurant.photos && restaurant.photos.length > 0 ? (
                                              <img 
                                                src={restaurant.photos[0]} 
                                                alt={restaurant.name}
                                                className="w-full h-full object-cover rounded-xl shadow-md border border-gray-200"
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  target.style.display = 'none';
                                                  target.nextElementSibling?.classList.remove('hidden');
                                                }}
                                              />
                                            ) : null}
                                            <div className={`w-full h-full ${restaurant.photos && restaurant.photos.length > 0 ? 'hidden' : ''} bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center border border-gray-200`}>
                                              <UtensilsCrossed className="h-8 w-8 text-orange-500" />
                                            </div>
                                          </div>

                                          {/* Enhanced Restaurant Info */}
                                          <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex items-start justify-between">
                                              <h4 className="text-xl font-bold text-gray-900 truncate pr-2 group-hover:text-blue-600 transition-colors">
                                                {restaurant.name}
                                              </h4>
                                            </div>
                                            
                                            {/* Rich Metadata Row */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                              {restaurant.category && (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 text-sm font-medium">
                                                  {restaurant.category}
                                                </Badge>
                                              )}
                                              
                                              {restaurant.rating && (
                                                <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-1 rounded-full border border-yellow-200">
                                                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                                  <span className="text-sm font-semibold text-gray-800">{restaurant.rating.toFixed(1)}</span>
                                                </div>
                                              )}
                                              
                                              {restaurant.priceLevel && (
                                                <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 px-3 py-1 text-sm">
                                                  {'$'.repeat(restaurant.priceLevel)}
                                                </Badge>
                                              )}
                                            </div>

                                            {/* Location and Distance */}
                                            {restaurant.location && (
                                              <div className="flex items-center gap-2 text-gray-600">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm truncate">{restaurant.location}</span>
                                                {restaurant.distance && (
                                                  <Badge variant="outline" className="bg-black text-white border-black px-2 py-1 text-xs font-medium ml-auto">
                                                    {restaurant.distance}km
                                                  </Badge>
                                                )}
                                              </div>
                                            )}

                                            {/* Google Verification Badge */}
                                            {restaurant.googlePlaceId && (
                                              <div className="flex items-center gap-1">
                                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none px-3 py-1 text-xs font-medium">
                                                  <CheckCircle className="h-3 w-3 mr-1" />
                                                  Google Verified
                                                </Badge>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Large Circular Add Button */}
                                        <Button
                                          onClick={() => handleAddRestaurant(restaurant)}
                                          className="ml-4 w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 border-4 border-white"
                                          size="sm"
                                        >
                                          <Plus className="h-8 w-8" />
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {!isSearching && searchQuery && restaurants && restaurants.length === 0 && (
                            <div className="flex items-center justify-center py-12">
                              <div className="text-center space-y-4 max-w-md">
                                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                  <Search className="h-8 w-8 text-orange-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">No restaurants found</h3>
                                <p className="text-lg text-gray-600 mb-4">
                                  We couldn't find any restaurants matching
                                </p>
                                <p className="text-xl font-bold text-orange-600 mb-6">
                                  "{searchQuery}"
                                </p>
                                <div className="space-y-3">
                                  <p className="text-sm text-gray-600">Try a different search term or add the restaurant manually</p>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setShowManualEntry(true)}
                                    className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold px-6 py-3 rounded-xl"
                                  >
                                    Add "{searchQuery}" manually
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {!searchQuery && (
                            <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-8 text-center">
                              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <Search className="h-10 w-10 text-blue-600" />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-800 mb-3">Ready to discover?</h3>
                              <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
                                Type in the search box above to find amazing restaurants near you
                              </p>
                              <Button 
                                variant="outline" 
                                onClick={() => setShowManualEntry(true)}
                                className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold px-6 py-3 rounded-xl"
                              >
                                Or add restaurant manually
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

                            {/* Quick Tag Suggestions */}
                            <div className="flex flex-wrap gap-1">
                              {[
                                "spicy", "sweet", "savory", "crispy", "tender", "juicy",
                                "signature", "recommended", "seasonal", "gluten-free",
                                "vegetarian", "vegan", "dairy-free", "must-try", "local-favorite"
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
};

export default AddListItemModal;