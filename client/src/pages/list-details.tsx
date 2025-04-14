import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Edit, MapPin, Utensils, ChefHat, Clock, Plus, Star, 
  Share2, Eye, BookmarkPlus, BookmarkCheck, Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RestaurantList, RestaurantListItemWithDetails } from "@/lib/types";
import { ShareListModal } from "@/components/lists/ShareListModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ListDetails() {
  const { id } = useParams();
  const listId = parseInt(id || "0");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: list, isLoading } = useQuery<RestaurantList>({
    queryKey: [`/api/restaurant-lists/${id}`],
  });
  
  // Increment view count when the component mounts
  useEffect(() => {
    if (id) {
      const incrementViewCount = async () => {
        try {
          await apiRequest("POST", `/api/restaurant-lists/${id}/view`);
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
      document.title = `${list.name} | TasteBuds`;
    }
    return () => {
      document.title = "TasteBuds";
    };
  }, [list]);
  
  // Save list mutation
  const saveListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/restaurant-lists/${id}/save`);
      return res.json();
    },
    onSuccess: () => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant-lists/${id}`] });
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
              
              {/* Created by and tags */}
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </Button>
                  
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
                Restaurants in this list ({list.restaurants?.length || 0})
              </h2>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Add Restaurant</span>
              </Button>
            </div>
            
            {/* Restaurant List Items */}
            {list.restaurants && list.restaurants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.restaurants.map((item: RestaurantListItemWithDetails) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex flex-col h-full">
                      <CardHeader className="pb-2">
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
                      </CardHeader>
                      
                      <CardContent className="pb-4 pt-2 flex-grow">
                        {item.notes && (
                          <div className="mt-2 text-neutral-700">{item.notes}</div>
                        )}
                        
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
                          </div>
                          
                          <Button size="sm" variant="ghost" className="flex items-center gap-1 text-primary">
                            <Star className="h-4 w-4" />
                            <span>See reviews</span>
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
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