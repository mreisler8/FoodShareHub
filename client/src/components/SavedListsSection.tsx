import { useQuery } from "@tanstack/react-query";
import { RestaurantListCard } from "@/components/lists/RestaurantListCard";
import { Skeleton } from "@/components/ui/skeleton";

interface SavedListsSectionProps {
  userId: number;
}

export function SavedListsSection({ userId }: SavedListsSectionProps) {
  const { data: savedLists, isLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${userId}/saved`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Saved Lists</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!savedLists?.length) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Saved Lists</h2>
        <p className="text-muted-foreground">No saved lists yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Saved Lists ({savedLists.length})</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {savedLists.map((savedItem) => (
          <RestaurantListCard 
            key={savedItem.listId} 
            list={savedItem.list}
            showSaveButton={false}
          />
        ))}
      </div>
    </div>
  );
}