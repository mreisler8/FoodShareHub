import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, MapPin, Utensils, ChefHat, X, Plus } from "lucide-react";
import { RestaurantSearchComponent } from "@/components/shared/RestaurantSearchComponent";
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

  const currentForm = itemType === "restaurant" ? restaurantForm : dishForm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>What are you adding?</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all ${
                itemType === "restaurant" 
                  ? "ring-2 ring-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setItemType("restaurant")}
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Utensils className="h-8 w-8 mb-2 text-primary" />
                <h3 className="font-medium">General Restaurant</h3>
                <p className="text-sm text-muted-foreground">
                  Add a restaurant to your list
                </p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${
                itemType === "dish" 
                  ? "ring-2 ring-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setItemType("dish")}
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <ChefHat className="h-8 w-8 mb-2 text-primary" />
                <h3 className="font-medium">Specific Dish</h3>
                <p className="text-sm text-muted-foreground">
                  Add a specific dish at a restaurant
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Restaurant Search */}
          {!showManualEntry ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  Search for {itemType === "restaurant" ? "restaurant" : "restaurant"}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualEntry(true)}
                >
                  Can't find it? Add manually
                </Button>
              </div>
              
              <RestaurantSearchComponent
                onSelect={handleRestaurantSelect}
                placeholder={`Search for ${itemType === "restaurant" ? "restaurants" : "restaurants"}...`}
                className="w-full"
              />

              {selectedRestaurant && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h5 className="font-medium">{selectedRestaurant.name}</h5>
                        {selectedRestaurant.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
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
            </div>
          ) : null}

          {/* Form Fields */}
          {(selectedRestaurant || showManualEntry) && (
            <div className="space-y-6">
              <Form {...currentForm}>
                <form 
                  onSubmit={itemType === "restaurant" 
                    ? restaurantForm.handleSubmit(handleRestaurantSubmit)
                    : dishForm.handleSubmit(handleDishSubmit)
                  } 
                  className="space-y-4"
                >
                  {itemType === "dish" && (
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
                  )}

                  {showManualEntry && (
                    <>
                      <FormField
                        control={currentForm.control}
                        name={itemType === "restaurant" ? "name" : "restaurantName"}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Restaurant Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Restaurant name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={currentForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="City" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tags</label>
                    <SmartTagInput
                      selectedTags={selectedTags}
                      onTagsChange={setSelectedTags}
                      contextRestaurants={selectedRestaurant ? [selectedRestaurant] : []}
                    />
                  </div>

                  <FormField
                    control={currentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="What makes this special?"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={currentForm.control}
                    name="photo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photo (Optional)</FormLabel>
                        <FormControl>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                            <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Add a photo to make your list more appealing
                            </p>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="min-h-[48px]"
                      disabled={
                        itemType === "restaurant" 
                          ? !restaurantForm.watch("name")
                          : !dishForm.watch("dishName") || !dishForm.watch("restaurantName")
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to List
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}