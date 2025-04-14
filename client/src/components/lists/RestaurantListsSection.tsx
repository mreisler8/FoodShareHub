import { useQuery } from "@tanstack/react-query";
import { RestaurantList } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantListCard } from "./RestaurantListCard";
import { ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface RestaurantListsSectionProps {
  hubId?: number;
  userId?: number;
  publicOnly?: boolean;
  title?: string;
  showCreateButton?: boolean;
  isCompact?: boolean;
  maxLists?: number;
}

export function RestaurantListsSection({
  hubId,
  userId,
  publicOnly = false,
  title = "Restaurant Lists",
  showCreateButton = false,
  isCompact = false,
  maxLists,
}: RestaurantListsSectionProps) {
  // Build query string based on props
  let queryString = "/api/restaurant-lists";
  
  if (hubId) {
    queryString += `?hubId=${hubId}`;
  } else if (userId) {
    queryString += `?userId=${userId}`;
  } else if (publicOnly) {
    queryString += "?publicOnly=true";
  }
  
  const { data: lists, isLoading } = useQuery<RestaurantList[]>({
    queryKey: [queryString],
  });
  
  const displayLists = maxLists && lists ? lists.slice(0, maxLists) : lists;
  
  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-heading font-bold text-neutral-900">{title}</h2>
        
        {showCreateButton && (
          <Link href="/lists/create">
            <a>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <ListPlus className="h-4 w-4" />
                <span>Create List</span>
              </Button>
            </a>
          </Link>
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
          <Link href={hubId ? `/hubs/${hubId}/lists` : userId ? `/users/${userId}/lists` : "/lists"}>
            <a className="text-primary hover:underline">
              View all {lists.length} lists
            </a>
          </Link>
        </div>
      )}
    </div>
  );
}