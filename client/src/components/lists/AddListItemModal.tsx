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

  const handleRestaurantSubmit = (data: RestaurantFormValues) => {
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
    onSave(item);
    handleClose();
  };

  const handleDishSubmit = (data: DishFormValues) => {
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
    onSave(item);
    handleClose();
  };

  const handleClose = () => {
    setItemType("restaurant");
    setSelectedRestaurant(null);
    setSelectedTags([]);
    setShowManualEntry(false);
    restaurantForm.reset();
    dishForm.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            🍽 What are you adding?
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto">
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
                        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                          Add Restaurant
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tags</label>
                      <SmartTagInput
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                      Add Restaurant
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tags</label>
                      <SmartTagInput
                        value={selectedTags}
                        onChange={setSelectedTags}
                        suggestions={["spicy", "must-try", "signature-dish", "comfort-food", "healthy"]}
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
                      <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                        Add Dish
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}