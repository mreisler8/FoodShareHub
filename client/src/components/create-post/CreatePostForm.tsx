import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPostSchema, type Restaurant } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Image, Star, Search, MapPin, Utensils, Check } from "lucide-react";

// Extend the post schema with form validation
const formSchema = insertPostSchema
  .omit({ userId: true }) // We'll get this from the current user
  .extend({
    restaurantName: z.string().min(1, "Restaurant name is required"),
    restaurantLocation: z.string().min(1, "Location is required"),
    restaurantCategory: z.string().min(1, "Category is required"),
    restaurantPriceRange: z.string().min(1, "Price range is required"),
    newDish: z.string().optional(),
  });

type FormValues = z.infer<typeof formSchema>;

export function CreatePostForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [dishesList, setDishesList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/me"],
  });
  
  // Restaurant search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: [`/api/restaurants?query=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length > 2,
  });

  // Form definition
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      rating: 5,
      visibility: "Public",
      dishesTried: [],
      images: [],
      restaurantName: "",
      restaurantLocation: "",
      restaurantCategory: "",
      restaurantPriceRange: "$$",
      newDish: "",
    },
  });

  // Create restaurant mutation
  const createRestaurantMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      location: string;
      category: string;
      priceRange: string;
    }) => {
      const response = await apiRequest("POST", "/api/restaurants", data);
      return await response.json();
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/posts", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({
        title: "Post created",
        description: "Your post has been published successfully!",
      });
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle restaurant selection
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setOpen(false);
    
    // Pre-fill the form with restaurant details
    form.setValue("restaurantName", restaurant.name);
    form.setValue("restaurantLocation", restaurant.location || restaurant.address || "");
    form.setValue("restaurantCategory", restaurant.category || restaurant.cuisine || "");
    form.setValue("restaurantPriceRange", restaurant.priceRange || "$$");
    
    // Reset the search
    setSearchQuery("");
  };
  
  // Handle search input change
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (value.length > 2) {
      // Trigger search
      queryClient.invalidateQueries({ 
        queryKey: [`/api/restaurants?query=${encodeURIComponent(value)}`] 
      });
    }
  };
  
  // Add dish to the list
  const addDish = () => {
    const newDish = form.watch("newDish");
    if (newDish && newDish.trim()) {
      setDishesList([...dishesList, newDish.trim()]);
      form.setValue("newDish", "");
    }
  };

  // Remove dish from the list
  const removeDish = (index: number) => {
    const updatedDishes = [...dishesList];
    updatedDishes.splice(index, 1);
    setDishesList(updatedDishes);
  };

  // Add image URL to the list
  const addImageUrl = () => {
    // In a real app, this would be a file upload
    // For now, we'll simulate by using placeholder images
    const placeholderImages = [
      "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1581873372796-635b67ca2008?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    ];
    
    if (imageUrls.length < 3) {
      const randomImage = placeholderImages[imageUrls.length];
      setImageUrls([...imageUrls, randomImage]);
    }
  };

  // Remove image from the list
  const removeImage = (index: number) => {
    const updatedImages = [...imageUrls];
    updatedImages.splice(index, 1);
    setImageUrls(updatedImages);
  };

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create a post",
        variant: "destructive",
      });
      return;
    }

    try {
      let restaurant;
      
      // If we've selected a restaurant from the dropdown that already exists in the database
      if (selectedRestaurant && selectedRestaurant.id) {
        console.log("Using selected restaurant:", selectedRestaurant);
        restaurant = selectedRestaurant;
      } 
      // If we've selected a Google restaurant that hasn't been saved to the database yet
      else if (selectedRestaurant && selectedRestaurant.googlePlaceId && !selectedRestaurant.id) {
        console.log("Saving Google Place to database:", selectedRestaurant.googlePlaceId);
        const response = await apiRequest("POST", "/api/google/places/save", { 
          placeId: selectedRestaurant.googlePlaceId 
        });
        restaurant = await response.json();
      } 
      // Otherwise create a new restaurant with the provided details
      else {
        console.log("Creating new restaurant with name:", values.restaurantName);
        restaurant = await createRestaurantMutation.mutateAsync({
          name: values.restaurantName,
          location: values.restaurantLocation,
          category: values.restaurantCategory,
          priceRange: values.restaurantPriceRange,
        });
      }

      // Verify we have a valid restaurant with an ID
      if (!restaurant || !restaurant.id) {
        throw new Error("Failed to get or create restaurant");
      }

      // Then create the post
      createPostMutation.mutate({
        userId: currentUser.id,
        restaurantId: restaurant.id,
        content: values.content,
        rating: values.rating,
        visibility: values.visibility,
        dishesTried: dishesList,
        images: imageUrls,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Post</CardTitle>
        <CardDescription>
          Share your restaurant experience with your friends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Restaurant Info Section */}
            <div className="space-y-4 border p-4 rounded-md">
              <h3 className="font-medium">Restaurant Information</h3>
              
              <FormField
                control={form.control}
                name="restaurantName"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Restaurant Name</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search restaurants..."
                              className="pl-8"
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                handleSearchInputChange(e.target.value);
                              }}
                              onFocus={() => setOpen(true)}
                            />
                          </div>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start" side="bottom" sideOffset={5} style={{ width: "var(--radix-popover-trigger-width)" }}>
                        <Command className="w-full">
                          <CommandInput
                            placeholder="Search for restaurants..."
                            value={searchQuery}
                            onValueChange={handleSearchInputChange}
                            className="h-9"
                          />
                          <CommandEmpty className="py-6 text-center text-sm">
                            {searchQuery.length > 2 ? "No restaurants found" : "Type at least 3 characters to search"}
                          </CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-auto">
                            {searchResults && Array.isArray(searchResults) && searchResults.map((restaurant: Restaurant) => (
                              <CommandItem
                                key={restaurant.id || restaurant.googlePlaceId}
                                value={restaurant.name}
                                onSelect={() => handleSelectRestaurant(restaurant)}
                                className="py-2 px-2"
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center">
                                    <span className="font-medium">{restaurant.name}</span>
                                    {restaurant.googlePlaceId && !restaurant.id && (
                                      <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        Google
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 mr-1" /> 
                                    <span>{restaurant.location || restaurant.address}</span>
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                      <Utensils className="h-3 w-3 inline mr-1" />
                                      {restaurant.category || restaurant.cuisine || "Restaurant"}
                                    </span>
                                    <span className="ml-1 text-xs text-muted-foreground">{restaurant.priceRange}</span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedRestaurant && (
                      <div className="mt-1 text-xs text-muted-foreground flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" /> Restaurant selected
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="restaurantLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Downtown, New York City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="restaurantCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Italian, Japanese" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="restaurantPriceRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Range</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a price range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="$">$ (Inexpensive)</SelectItem>
                          <SelectItem value="$$">$$ (Moderate)</SelectItem>
                          <SelectItem value="$$$">$$$ (Expensive)</SelectItem>
                          <SelectItem value="$$$$">$$$$ (Very Expensive)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Post Content Section */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Review</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your experience at this restaurant..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => field.onChange(star)}
                          className={`text-2xl ${
                            field.value >= star ? "text-yellow-400" : "text-gray-300"
                          }`}
                        >
                          <Star className={field.value >= star ? "fill-current" : ""} />
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Dishes Tried Section */}
              <div className="space-y-2">
                <FormLabel>Dishes Tried</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {dishesList.map((dish, index) => (
                    <div
                      key={index}
                      className="px-3 py-1 bg-neutral-100 rounded-full text-sm text-neutral-700 flex items-center"
                    >
                      {dish}
                      <button
                        type="button"
                        onClick={() => removeDish(index)}
                        className="ml-1 text-neutral-500 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="newDish"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Add a dish..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" onClick={addDish} variant="outline">Add</Button>
                </div>
              </div>
              
              {/* Images Section */}
              <div className="space-y-2">
                <FormLabel>Images</FormLabel>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative rounded-md overflow-hidden h-24">
                      <img src={url} className="w-full h-full object-cover" alt={`Uploaded ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {imageUrls.length < 3 && (
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="h-24 border-2 border-dashed border-neutral-300 rounded-md flex items-center justify-center text-neutral-500 hover:text-primary hover:border-primary transition-colors"
                    >
                      <Image className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Visibility Section */}
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Visibility</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Who can see this post" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Public">Public</SelectItem>
                        <SelectItem value="Friends">Friends Only</SelectItem>
                        <SelectItem value="Italian Cuisine">Italian Cuisine Hub</SelectItem>
                        <SelectItem value="Japanese Delights">Japanese Delights Hub</SelectItem>
                        <SelectItem value="NYC Dining Scene">NYC Dining Scene Hub</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose who can see your post
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={createPostMutation.isPending || createRestaurantMutation.isPending}
            >
              {createPostMutation.isPending ? "Posting..." : "Share Your Experience"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
