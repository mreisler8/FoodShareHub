import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Edit, MapPin, Utensils, ChefHat, Clock, Plus, Star, 
  Share2, Eye, BookmarkPlus, BookmarkCheck, Users, Trash2, MoreVertical, GripVertical
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RestaurantList, RestaurantListItemWithDetails } from "@/lib/types";
import { ShareListModal } from "@/components/lists/ShareListModal";
import { EditListModal } from "@/components/lists/EditListModal";
import { AddListItemModal } from "@/components/lists/AddListItemModal";
import RestaurantSearch from "@/components/lists/RestaurantSearch";
import { ListItemCard } from "@/components/lists/ListItemCard";
import { ListItemForm } from "@/components/ListItemForm";
import { FilterSortControls } from "@/components/lists/FilterSortControls";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { AppHeader } from "@/components/ui/AppHeader";

// Extended interface for optimistic list items
interface OptimisticListItem extends RestaurantListItemWithDetails {
  isOptimistic?: boolean;
  tags?: string[];
  priceAssessment?: string | null | undefined;
}

// Sortable List Item Component
interface SortableListItemProps {
  item: OptimisticListItem;
  rank: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: any) => void;
  isEditing: boolean;
  isOwner: boolean;
}

function SortableListItem({ item, rank, onEdit, onDelete, onUpdate, isEditing, isOwner }: SortableListItemProps) {
  const [editingNotes, setEditingNotes] = useState(item.notes || "");
  const [editingRating, setEditingRating] = useState(item.rating || 0);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveEdit = () => {
    onUpdate(item.id, {
      notes: editingNotes,
      rating: editingRating > 0 ? editingRating : undefined,
    });
  };

  const handleCancelEdit = () => {
    setEditingNotes(item.notes || "");
    setEditingRating(item.rating || 0);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${isDragging ? "shadow-lg scale-105 z-50" : "hover:shadow-md"} ${
        item.isOptimistic ? "opacity-75 bg-blue-50" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Drag Handle - Only for owners */}
          {isOwner && (
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mt-2"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}

          {/* Rank Badge */}
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full font-semibold text-sm mt-2">
            {rank}
          </div>

          {/* Restaurant Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                {item.restaurant?.imageUrl ? (
                  <img 
                    src={item.restaurant.imageUrl} 
                    alt={item.restaurant.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">
                      {item.restaurant?.name?.charAt(0) || "R"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{item.restaurant?.name || "Restaurant"}</h4>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{item.restaurant?.location || "Location not specified"}</span>
                  {item.restaurant?.category && (
                    <Badge variant="secondary" className="text-xs">
                      {item.restaurant.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Rating */}
            {isEditing ? (
              <div className="mb-3">
                <label className="text-sm font-medium mb-1 block">Rating</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setEditingRating(rating)}
                      className={`text-lg ${
                        rating <= editingRating ? "text-yellow-400" : "text-gray-300"
                      } hover:text-yellow-400 transition-colors`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              item.rating && (
                <div className="flex items-center space-x-1 mb-2">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < item.rating! ? "text-yellow-400 fill-current" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">({item.rating}/5)</span>
                </div>
              )
            )}

            {/* Notes */}
            {isEditing ? (
              <div className="mb-3">
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Add your thoughts about this restaurant..."
                  className="resize-none"
                  rows={3}
                />
              </div>
            ) : (
              item.notes && (
                <p className="text-sm text-muted-foreground mb-2">{item.notes}</p>
              )
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {item.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions - Only for owners */}
            {isOwner && (
              <div className="flex space-x-2 pt-2">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onEdit(item.id)}>
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onDelete(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ListDetails() {
  const { id } = useParams();
  const listId = parseInt(id || "0");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showRestaurantSearch, setShowRestaurantSearch] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [listItems, setListItems] = useState<OptimisticListItem[]>([]);
  const [sortBy, setSortBy] = useState('position');
  const [filters, setFilters] = useState<{ cuisine?: string; city?: string }>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Edit item handler
  const handleEdit = (itemId: number) => {
    setEditingId(itemId);
  };

  // Delete item handler
  const handleDelete = async (itemId: number) => {
    const originalItems = [...listItems];
    try {
      // Optimistically remove item
      setListItems(prev => prev.filter(item => item.id !== itemId));
      
      await apiRequest("DELETE", `/api/lists/items/${itemId}`, {});
      
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
      toast({
        title: "Item deleted",
        description: "The restaurant has been removed from your list.",
      });
    } catch (error) {
      // Restore original items on error
      setListItems(originalItems);
      toast({
        title: "Delete failed",
        description: "Failed to delete the item. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update item handler
  const handleUpdate = async (itemId: number, data: any) => {
    const originalItems = [...listItems];
    try {
      // Optimistically update item
      setListItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, ...data, isOptimistic: true }
          : item
      ));
      
      const response = await apiRequest("PUT", `/api/lists/items/${itemId}`, {}, data);
      const updatedItem = await response.json();
      
      // Replace optimistic item with real data
      setListItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, ...updatedItem, isOptimistic: false }
          : item
      ));
      
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
      setEditingId(null);
      toast({
        title: "Item updated",
        description: "The restaurant details have been updated.",
      });
    } catch (error) {
      // Restore original data on error
      setListItems(originalItems);
      setEditingId(null);
      toast({
        title: "Update failed",
        description: "Failed to update the item. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle adding items from AddListItemModal
  const handleAddItem = async (itemData: any) => {
    try {
      let restaurantId: number;
      
      // Handle restaurant creation for Google Places results
      if (itemData.restaurant?.id) {
        restaurantId = itemData.restaurant.id;
      } else {
        // Create new restaurant
        const restaurantResponse = await apiRequest("POST", "/api/restaurants", {}, {
          name: itemData.restaurant?.name || "Unknown Restaurant",
          location: itemData.restaurant?.location || itemData.restaurant?.city || "",
          category: "Restaurant",
          priceRange: "$$",
          cuisine: "Restaurant",
          imageUrl: null,
          googlePlaceId: itemData.restaurant?.googlePlaceId || null,
        });
        const newRestaurant = await restaurantResponse.json();
        restaurantId = newRestaurant.id;
      }

      // Add item to list
      const response = await apiRequest("POST", `/api/lists/${listId}/items`, {}, {
        restaurantId: restaurantId,
        rating: 5, // Default rating
        liked: null,
        disliked: null,
        notes: itemData.notes || null,
        tags: itemData.tags || [],
      });
      
      const newItem = await response.json();
      
      // Update local state
      setListItems(prev => [newItem, ...prev]);
      
      // Close modal
      setShowAddItemModal(false);
      
      toast({
        title: "Item added successfully!",
        description: `${itemData.restaurant?.name} has been added to your list.`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}`] });
      
    } catch (error: any) {
      toast({
        title: "Failed to add item",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = listItems.findIndex(item => item.id.toString() === active.id);
      const newIndex = listItems.findIndex(item => item.id.toString() === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(listItems, oldIndex, newIndex);
        
        // Optimistically update local state
        setListItems(reorderedItems);
        
        try {
          // Update positions on server
          const updatePromises = reorderedItems.map((item, index) => 
            apiRequest("PUT", `/api/lists/items/${item.id}`, {}, { 
              position: index + 1 
            })
          );
          
          await Promise.all(updatePromises);
          
          queryClient.invalidateQueries({ queryKey: [`/api/lists/${id}`] });
          toast({
            title: "List reordered",
            description: "Your list order has been saved.",
          });
        } catch (error) {
          // Revert on error
          setListItems(listItems);
          toast({
            title: "Reorder failed",
            description: "Failed to save the new order. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };



  // Delete list handler
  const deleteListMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/lists/${listId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "List deleted",
        description: "Your list has been permanently deleted.",
      });
      navigate("/lists");
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteList = () => {
    deleteListMutation.mutate();
  };
  
  const { data: list, isLoading, error } = useQuery<RestaurantList>({
    queryKey: [`/api/lists/${id}`],
  });

  // Debug logging
  console.log("ListDetails - ID:", id, "List ID:", listId);
  console.log("ListDetails - Query state:", { list, isLoading, error });
  console.log("ListDetails - Query key:", [`/api/lists/${id}`]);

  // Compute filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...listItems];
    
    // Apply filters
    if (filters.cuisine) {
      filtered = filtered.filter(item => 
        item.restaurant?.category?.toLowerCase().includes(filters.cuisine!.toLowerCase())
      );
    }
    
    if (filters.city) {
      filtered = filtered.filter(item => 
        item.restaurant?.location?.toLowerCase().includes(filters.city!.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === 'rating_asc') {
        return (a.rating || 0) - (b.rating || 0);
      } else {
        // Default: position (maintain original order)
        return 0;
      }
    });
    
    return filtered;
  }, [listItems, filters, sortBy]);

  // Compute list statistics
  const listStats = useMemo(() => {
    const totalItems = listItems.length;
    const avgRating = listItems.reduce((sum, item) => sum + (item.rating || 0), 0) / totalItems;
    const cuisines = Array.from(new Set(listItems.map(item => item.restaurant?.category).filter(Boolean)));
    const cities = Array.from(new Set(listItems.map(item => {
      // Extract city from location string
      const location = item.restaurant?.location || '';
      const cityMatch = location.match(/^([^,]+)/);
      return cityMatch ? cityMatch[1].trim() : location.trim();
    }).filter(Boolean)));
    
    return {
      totalItems,
      avgRating: isNaN(avgRating) ? 0 : avgRating,
      cuisines,
      cities
    };
  }, [listItems]);

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
      tags: [],
      priceAssessment: "$$",
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
        const response = await apiRequest("POST", "/api/restaurants", {}, {
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
      const listResponse = await apiRequest("POST", `/api/lists/${listId}/items`, {}, {
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
          await apiRequest("POST", `/api/lists/${id}/view`, {});
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
      const res = await apiRequest("POST", `/api/lists/${id}/save`, {});
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
      <div className="flex-1 max-w-5xl mx-auto">
        {/* App Header with back button and logo */}
        <AppHeader 
          title={list?.name || "List Details"} 
          showBackButton={true} 
          onBack={() => window.history.back()}
        />
        
        <div className="px-4 py-6 md:px-8 pt-14">
        
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
                <div className="flex items-center gap-2">
                  {/* Show badges for sharing status */}
                  {list.shareWithCircle && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Circle
                    </Badge>
                  )}
                  {list.makePublic && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Public
                    </Badge>
                  )}
                  
                  {/* Share button - only show if list is public */}
                  {list.makePublic && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast({
                          title: "Link copied!",
                          description: "Share this link with others to show them your list.",
                        });
                      }}
                      className="flex items-center gap-1"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  )}
                  
                  {/* Edit/Delete buttons - only show for list owner */}
                  {user && list.createdById === user.id && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit List
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <MoreVertical className="h-4 w-4" />
                            More
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setIsShareModalOpen(true)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share with Circle
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete List
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
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
              {user && list.createdById === user.id && (
                <Button 
                  size="sm" 
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setShowAddItemModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Restaurant
                </Button>
              )}
            </div>
            
            {/* Filter & Sort Controls */}
            {listItems && listItems.length > 0 && (
              <div className="mb-6">
                <FilterSortControls
                  stats={listStats}
                  onSortChange={setSortBy}
                  onFilterChange={setFilters}
                  currentSort={sortBy}
                  currentFilters={filters}
                />
              </div>
            )}
            
            {/* Drag and Drop Restaurant List */}
            {listItems && listItems.length > 0 ? (
              filteredAndSortedItems.length > 0 ? (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={filteredAndSortedItems.map(item => item.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {filteredAndSortedItems.map((item: OptimisticListItem, index: number) => (
                        <SortableListItem
                          key={item.id}
                          item={item}
                          rank={index + 1}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onUpdate={handleUpdate}
                          isEditing={editingId === item.id}
                          isOwner={user?.id === list.createdById}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-neutral-500">No restaurants match your filters.</p>
                  <p className="text-neutral-500 mt-2">
                    Try adjusting your filters or add more restaurants to your list.
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <div className="mb-4">
                  <Utensils className="h-12 w-12 text-neutral-300 mx-auto" />
                </div>
                <p className="text-neutral-500 text-lg font-medium">This list is empty</p>
                <p className="text-neutral-400 mt-2">
                  Add restaurants to start building your collection!
                </p>
                {user && list.createdById === user.id && (
                  <Button 
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setShowAddItemModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Restaurant
                  </Button>
                )}
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
      </div>
      
      {/* Share List Modal */}
      <ShareListModal 
        open={isShareModalOpen} 
        onOpenChange={setIsShareModalOpen} 
        listId={listId}
      />
      
      {/* Edit List Modal */}
      {list && (
        <EditListModal 
          open={isEditModalOpen} 
          onOpenChange={setIsEditModalOpen} 
          list={list}
        />
      )}

      {/* Add Item Modal */}
      <AddListItemModal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        onSave={handleAddItem}
      />
      
      {/* Delete List Confirmation Dialog */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this list? This action cannot be undone.
              All restaurants in this list will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteList}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteListMutation.isPending}
            >
              {deleteListMutation.isPending ? 'Deleting...' : 'Delete List'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}