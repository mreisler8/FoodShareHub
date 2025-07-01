import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { RestaurantList } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantListCard } from "./RestaurantListCard";
import { CreateListModal } from "./CreateListModal";
import { ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface RestaurantListsSectionProps {
  circleId?: number;
  userId?: number;
  publicOnly?: boolean;
  title?: string;
  showCreateButton?: boolean;
  isCompact?: boolean;
  maxLists?: number;
}

export function RestaurantListsSection({
  circleId,
  userId,
  publicOnly = false,
  title = "Restaurant Lists",
  showCreateButton = false,
  isCompact = false,
  maxLists,
}: RestaurantListsSectionProps) {
  const [, navigate] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Build query key and endpoint based on props
  let queryKey: string[];
  let endpoint: string;
  
  if (circleId) {
    queryKey = ["/api/circles", circleId.toString(), "shared-lists"];
    endpoint = `/api/circles/${circleId}/shared-lists`;
  } else if (userId) {
    queryKey = ["/api/restaurant-lists", "user", userId.toString()];
    endpoint = `/api/restaurant-lists?userId=${userId}`;
  } else if (publicOnly) {
    queryKey = ["/api/restaurant-lists", "public"];
    endpoint = "/api/restaurant-lists?publicOnly=true";
  } else {
    queryKey = ["/api/restaurant-lists"];
    endpoint = "/api/restaurant-lists";
  }
  
  const { data: lists, isLoading } = useQuery<RestaurantList[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch lists');
      return res.json();
    }
  });
  
  const displayLists = maxLists && lists ? lists.slice(0, maxLists) : lists;
  
  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-heading font-bold text-neutral-900">{title}</h2>
        
        {showCreateButton && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={() => setShowCreateModal(true)}
          >
            <ListPlus className="h-4 w-4" />
            <span>Create List</span>
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className={`grid gap-4 ${isCompact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
          {Array(isCompact ? 3 : 2).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : displayLists && displayLists.length > 0 ? (
        <div className={`grid gap-4 ${isCompact ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}>
          {displayLists.map((list) => (
            <RestaurantListCard key={list.id} list={list} isCompact={isCompact} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-xl shadow-sm">
          <p className="text-neutral-500">No restaurant lists found.</p>
          {showCreateButton && (
            <p className="text-neutral-500 mt-2">Create your first list to start sharing your favorite restaurants!</p>
          )}
        </div>
      )}
      
      {maxLists && lists && lists.length > maxLists && (
        <div className="text-center mt-4">
          <Link href={circleId ? `/circles/${circleId}/lists` : userId ? `/users/${userId}/lists` : "/lists"} className="text-primary hover:underline">
            View all {lists.length} lists
          </Link>
        </div>
      )}
      
      <CreateListModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(listId) => {
          // Navigate to the new list on successful creation
          navigate(`/lists/${listId}`);
        }}
      />
    </div>
  );
}