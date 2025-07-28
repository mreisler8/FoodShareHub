import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, X } from "lucide-react";
import { RestaurantSearchComponent } from "../shared/RestaurantSearchComponent";
import { LocationService, type LocationData } from '@/services/locationService';
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
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        },
        tags: selectedTags,
        notes: data.notes,
        photo: data.photo,
      };
      await onSave(item);
      setAddedCount(prev => prev + 1);
      setShowSuccess(true);
      resetForm();
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
      setShowSuccess(true);
      resetForm();
    } catch (error) {
      console.error("Failed to add dish:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setItemType("restaurant");
    setSelectedRestaurant(null);
    setSelectedTags([]);
    setShowManualEntry(false);
    setShowSuccess(false);
    restaurantForm.reset();
    dishForm.reset();
  };

  const handleClose = () => {
    resetForm();
    setAddedCount(0);
    onOpenChange(false);
  };

  const handleAddAnother = () => {
    resetForm();
  };

  const handleDone = () => {
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] min-h-[400px] flex flex-col overflow-hidden">
        <DialogHeader className="pb-4 flex-shrink-0 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            🍽 What are you adding?
          </DialogTitle>
          {addedCount > 0 && (
            <div className="text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg">
              ✓ {addedCount} restaurant{addedCount !== 1 ? 's' : ''} added to list
            </div>
          )}
        </DialogHeader>

        {showSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-6 bg-gradient-to-br from-green-50 to-blue-50">
            <div className="text-center space-y-4 bg-white p-6 rounded-xl shadow-sm border">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <div className="text-2xl">✅</div>
              </div>
              <h3 className="text-xl font-bold text-green-700">Successfully Added!</h3>
              <p className="text-sm text-gray-700 font-medium">
                "{selectedRestaurant?.name || restaurantForm.getValues("name")}" is now in your list
              </p>
              <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                Total items: {addedCount}
              </div>
            </div>
            
            <div className="flex gap-3 w-full max-w-md">
              <Button 
                onClick={handleAddAnother}
                variant="outline"
                className="flex-1 bg-white hover:bg-gray-50 border-2 border-blue-200 text-blue-700 font-semibold"
              >
                + Add Another
              </Button>
              <Button 
                onClick={handleDone}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Done Adding
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-1" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              <Tabs value={itemType} onValueChange={(value) => setItemType(value as "restaurant" | "dish")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="restaurant" className="flex items-center gap-2">
                🏙 Restaurant
              </TabsTrigger>
              <TabsTrigger value="dish" className="flex items-center gap-2">
                🍽 Dish @ Restaurant
              </TabsTrigger>
            </TabsList>

            <TabsContent value="restaurant" className="space-y-4">
              {!showManualEntry ? (
                <div className="space-y-4">
                  <RestaurantSearchComponent
                    onSelect={handleRestaurantSelect}
                    placeholder="Search for restaurants..."
                    className="w-full"
                    showLocationServices={true}
                    autoRequestLocation={true}
                  />
                  
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
                    Can't find it? Add manually
                  </Button>
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

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tags</label>
                        <SmartTagInput
                          selectedTags={selectedTags}
                          onTagsChange={setSelectedTags}
                          placeholder="Add tags (e.g., spicy, romantic, casual)..."
                          maxTags={8}
                          suggestions={[
                            "casual", "fine-dining", "romantic", "family-friendly", 
                            "quick-bite", "brunch", "date-night", "business-lunch",
                            "spicy", "vegetarian", "vegan", "seafood", "steakhouse",
                            "pizza", "sushi", "italian", "mexican", "asian", "american"
                          ]}
                        />
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

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Tags</label>
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

            <TabsContent value="dish" className="space-y-4">
              {!showManualEntry ? (
                <div className="space-y-4">
                  <RestaurantSearchComponent
                    onSelect={handleRestaurantSelect}
                    placeholder="Search for the restaurant..."
                    className="w-full"
                  />
                  
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

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Tags</label>
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
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}