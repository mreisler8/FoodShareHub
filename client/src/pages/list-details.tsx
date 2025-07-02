import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Edit, MapPin, Utensils, ChefHat, Clock, Plus, Star, 
  Share2, Eye, BookmarkPlus, BookmarkCheck, Users, Trash2, MoreVertical
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RestaurantList, RestaurantListItemWithDetails } from "@/lib/types";
import { ShareListModal } from "@/components/lists/ShareListModal";
import { RestaurantSearch } from "@/components/lists/RestaurantSearch";
import { ListItemCard } from "@/components/lists/ListItemCard";
import { ListItemForm } from "@/components/ListItemForm";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Extended interface for optimistic list items
interface OptimisticListItem extends RestaurantListItemWithDetails {
  isOptimistic?: boolean;
}

export default function ListDetails() {
  const { id } = useParams();
  const listId = parseInt(id || "0");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showRestaurantSearch, setShowRestaurantSearch] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [listItems, setListItems] = useState<OptimisticListItem[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: list, isLoading, error } = useQuery<RestaurantList>({
    queryKey: [`/api/lists/${id}`],
  });

  // Debug logging
  console.log("ListDetails - ID:", id, "List ID:", listId);
  console.log("ListDetails - Query state:", { list, isLoading, error });
  console.log("ListDetails - Query key:", [`/api/lists/${id}`]);

  // Sync server data with local state when it loads
  useEffect(() => {
    if (list?.items) {
      setListItems(list.items.map((item: RestaurantListItemWithDetails) => ({ ...item, isOptimistic: false })));
    }
  }, [list?.items]);

  // Optimistic add function for handling inline form submissions
  const handleOptimisticAdd = async (data: {
    restaurantId: string;
    restaurantName: string;
    rating: number;
    liked: string;
    disliked: string;
    notes: string;
  }) => {
    // Create optimistic item with all required properties
    const optimisticItem: OptimisticListItem = {
      id: -Date.now(), // Use negative timestamp for unique temporary ID
      listId: listId,
      restaurantId: parseInt(data.restaurantId.replace('google_', '')),
      rating: data.rating,
      liked: data.liked || null,
      disliked: data.disliked || null,
      notes: data.notes || null,
      mustTryDishes: [],
      addedById: list?.createdById || 0, // Use the list creator ID
      position: 0,
      addedAt: new Date(),
      isOptimistic: true,
      restaurant: {
        id: parseInt(data.restaurantId.replace('google_', '')),
        name: data.restaurantName,
        location: "Loading...",
        category: "Restaurant",
        priceRange: "$$",
        openTableId: null,
        resyId: null,
        googlePlaceId: null,
        address: null,
        neighborhood: null,
        city: null,
        state: null,
        country: "US",
        postalCode: null,
        latitude: null,
        longitude: null,
        phone: null,
        website: null,
        cuisine: "Restaurant",
        hours: null,
        description: null,
        imageUrl: null,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    };

    // Add optimistic item to the beginning of the list
    setListItems(prev => [optimisticItem, ...prev]);

    try {
      // Create restaurant if needed (Google Places result)
      let restaurantId: number;
      if (data.restaurantId.startsWith('google_')) {
        const response = await apiRequest("POST", "/api/restaurants", {
          name: data.restaurantName,
          location: "Unknown location",
          category: "Restaurant",
          priceRange: "$$",
          cuisine: "Restaurant",
          imageUrl: null,
          googlePlaceId: data.restaurantId.replace('google_', ''),
        });
        const newRestaurant = await response.json() as { id: number };
        restaurantId = newRestaurant.id;
      } else {
        restaurantId = parseInt(data.restaurantId);
      }

      // Add to list
      const listResponse = await apiRequest("POST", `/api/lists/${listId}/items`, {
        restaurantId: restaurantId,
        rating: data.rating,
        liked: data.liked || null,
        disliked: data.disliked || null,
        notes: data.notes || null,
      });
      
      const realItem = await listResponse.json();
      
      // Replace optimistic item with real data
      setListItems(prev =>
        prev.map(item => item.id === optimisticItem.id ? { ...realItem, isOptimistic: false } : item)
      );

      toast({
        title: "Restaurant added!",
        description: `${data.restaurantName} has been added to your list.`,
      });

      // Invalidate queries to sync with server
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}`] });
      
    } catch (error: any) {
      // Remove optimistic item on failure
      setListItems(prev => prev.filter(item => item.id !== optimisticItem.id));
      
      toast({
        title: "Failed to add restaurant",
        description: "Please try again.",
        variant: "destructive",
      });
      
      throw error; // Re-throw to handle in calling component
    }
  };

  // Delete list item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest("DELETE", `/api/lists/${listId}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}`] });
      toast({
        title: "Restaurant removed",
        description: "The restaurant has been removed from your list.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove restaurant.",
        variant: "destructive",
      });
    }
  });
  
  // Increment view count when the component mounts
  useEffect(() => {
    if (id) {
      const incrementViewCount = async () => {
        try {
          await apiRequest("POST", `/api/lists/${id}/view`);
        } catch (error) {
          console.error("Failed to increment view count", error);
        }
      };
      
      incrementViewCount();
    }
  }, [id]);
  
  // Set page title
  useEffect(() => {
    if (list) {
      document.title = `${list.name} | Circles`;
    }
    return () => {
      document.title = "Circles";
    };
  }, [list]);
  
  // Save list mutation
  const saveListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/lists/${id}/save`);
      return res.json();
    },
    onSuccess: () => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
      toast({
        title: "List saved",
        description: "This list has been saved to your collection",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center text-neutral-700 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
          </Link>
        </div>
        
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex space-x-2 mt-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        ) : list ? (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-heading font-bold text-neutral-900">{list.name}</h1>
                  {list.description && (
                    <p className="text-neutral-700 mt-2">{list.description}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Edit className="h-4 w-4" />
                  <span>Edit List</span>
                </Button>
              </div>
              
              {/* Created by, visibility, and tags */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {list.creator && (
                  <div className="flex items-center text-sm text-neutral-500 mr-4">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={list.creator.profilePicture || undefined} alt={list.creator.name} />
                      <AvatarFallback>{list.creator.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>Created by {list.creator.name}</span>
                  </div>
                )}
                
                {/* Sharing Badges - show individual badges based on sharing settings */}
                {list.circleId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>Circle</span>
                  </Badge>
                )}
                {list.isPublic && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>Public</span>
                  </Badge>
                )}
                
                {list.tags && list.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {list.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        <span>{tag}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Stats and Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl">
                {/* Stats */}
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center text-sm">
                    <Eye className="h-4 w-4 mr-2 text-neutral-500" />
                    <span className="font-medium">{list.viewCount || 0}</span>
                    <span className="ml-1 text-neutral-500">views</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <BookmarkCheck className="h-4 w-4 mr-2 text-neutral-500" />
                    <span className="font-medium">{list.saveCount || 0}</span>
                    <span className="ml-1 text-neutral-500">saves</span>
                  </div>
                  
                  {list.circle && (
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-neutral-500" />
                      <span>Shared with <span className="font-medium">{list.circle.name}</span></span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Share button only for public lists */}
                  {list.visibility === 'public' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => {
                        // Copy URL to clipboard for public lists
                        const url = window.location.href;
                        navigator.clipboard.writeText(url).then(() => {
                          toast({
                            title: "Link copied!",
                            description: "Share this link with anyone to view this list.",
                          });
                        }).catch(() => {
                          toast({
                            title: "Share",
                            description: `Share this link: ${url}`,
                            variant: "default",
                          });
                        });
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </Button>
                  )}
                  
                  <Button 
                    variant={isSaved ? "secondary" : "outline"}
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => saveListMutation.mutate()}
                    disabled={saveListMutation.isPending || isSaved}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="h-4 w-4" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="h-4 w-4" />
                        <span>Save List</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-heading font-bold text-neutral-900">
                Restaurants in this list ({listItems?.length || 0})
              </h2>
              <Button 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => setShowRestaurantSearch(!showRestaurantSearch)}
              >
                <Plus className="h-4 w-4" />
                <span>{showRestaurantSearch ? "Cancel" : "Add Restaurant"}</span>
              </Button>
            </div>
            
            {/* Restaurant Search Interface */}
            {showRestaurantSearch && (
              <div className="mb-6">
                <RestaurantSearch 
                  listId={listId}
                  onRestaurantAdded={handleOptimisticAdd}
                  onAddCompleted={() => {
                    setShowRestaurantSearch(false);
                  }}
                />
              </div>
            )}
            
            {/* Restaurant List Items */}
            {listItems && listItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listItems.map((item: OptimisticListItem) => {
                  const renderStars = (rating: number | null) => {
                    if (!rating) return null;
                    return Array(5).fill(0).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ));
                  };

                  // Check if current user can edit/delete this item
                  const canEditItem = item.addedById === list.createdById; // For now, allow list owner to edit all items

                  return (
                    <Card key={item.id} className={`overflow-hidden ${item.isOptimistic ? 'opacity-70 border-dashed' : ''}`}>
                      <div className="flex flex-col h-full">
                        {/* Optimistic loading indicator */}
                        {item.isOptimistic && (
                          <div className="bg-blue-50 px-3 py-1 text-xs text-blue-600 flex items-center">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
                            Saving...
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg font-heading">
                                {item.restaurant?.name}
                              </CardTitle>
                              <div className="flex items-center text-sm text-neutral-500 mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span>{item.restaurant?.location}</span>
                                <span className="mx-2">•</span>
                                <span>{item.restaurant?.category}</span>
                                <span className="mx-2">•</span>
                                <span>{item.restaurant?.priceRange}</span>
                              </div>
                              
                              {/* Rating */}
                              {item.rating && (
                                <div className="flex items-center mt-2">
                                  <div className="flex">{renderStars(item.rating)}</div>
                                  <span className="ml-2 text-sm text-neutral-600">({item.rating}/5)</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Edit/Delete actions for items the user can manage */}
                            {canEditItem && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingItem(item.id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => deleteItemMutation.mutate(item.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pb-4 pt-2 flex-grow">
                          {/* What I liked */}
                          {item.liked && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium text-green-700 mb-1">What I liked:</h4>
                              <p className="text-sm text-neutral-700">{item.liked}</p>
                            </div>
                          )}
                          
                          {/* What I didn't like */}
                          {item.disliked && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium text-red-700 mb-1">What I didn't like:</h4>
                              <p className="text-sm text-neutral-700">{item.disliked}</p>
                            </div>
                          )}
                          
                          {/* Additional notes */}
                          {item.notes && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium text-neutral-700 mb-1">Notes:</h4>
                              <p className="text-sm text-neutral-700">{item.notes}</p>
                            </div>
                          )}
                          
                          {/* Must-try dishes (legacy field) */}
                          {item.mustTryDishes && item.mustTryDishes.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center text-sm font-semibold">
                                <ChefHat className="h-4 w-4 mr-1 text-primary" />
                                <span>Must-try dishes:</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.mustTryDishes.map((dish: string, i: number) => (
                                  <Badge key={i} variant="outline" className="bg-primary/5">
                                    {dish}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4 flex justify-between items-end">
                            <div className="flex items-center text-sm text-neutral-500">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>Added by {item.addedBy?.name || "anonymous"}</span>
                              {item.addedAt && (
                                <span className="ml-2">
                                  • {new Date(item.addedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                <p className="text-neutral-500">This list doesn't have any restaurants yet.</p>
                <p className="text-neutral-500 mt-2">
                  Add restaurants to start building your collection!
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10">
            <p className="text-neutral-700">List not found.</p>
            <Link href="/" className="text-primary hover:underline mt-2 inline-block">
              Return to Home
            </Link>
          </div>
        )}
      </div>
      
      {/* Share List Modal */}
      <ShareListModal 
        open={isShareModalOpen} 
        onOpenChange={setIsShareModalOpen} 
        listId={listId}
      />
    </div>
  );
}