import { useQuery } from "@tanstack/react-query";
import { RestaurantListCard } from "./RestaurantListCard";
import { CreateListModal } from "./CreateListModal";
import { useState } from "react";
import { Button } from "../Button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { RestaurantList } from "@shared/schema";

export function RestaurantListsSection() {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: lists = [], isLoading } = useQuery<RestaurantList[]>({
    queryKey: ["/api/lists"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">My Lists</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create List
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first list to organize your favorite restaurants
          </p>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Your First List
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {lists.map((list) => (
            <RestaurantListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}