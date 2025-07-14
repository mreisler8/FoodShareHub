import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RestaurantListCard } from "./lists/RestaurantListCard";
import { Skeleton } from "@/components/ui/skeleton";

export function SavedListsSection() {
  const { data: savedLists, isLoading } = useQuery({
    queryKey: ['/api/saved-lists'],
    queryFn: async () => {
      const response = await apiRequest('/api/saved-lists');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Saved Lists</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!savedLists || savedLists.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Saved Lists</h2>
        <div className="text-center py-8 text-muted-foreground">
          <p>No saved lists yet.</p>
          <p className="text-sm mt-2">Lists you save will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Saved Lists</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {savedLists.map((savedList: any) => (
          <RestaurantListCard 
            key={savedList.id} 
            list={savedList.list}
          />
        ))}
      </div>
    </div>
  );
}