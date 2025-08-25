import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Plus, List, Users } from "lucide-react";
import { Link } from "wouter";

interface RestaurantList {
  id: number;
  name: string;
  description?: string;
  itemCount: number;
  isPrivate: boolean;
  createdAt: Date;
}

export function MyLists() {
  const { user } = useAuth();
  
  const { data: lists = [], isLoading } = useQuery<RestaurantList[]>({
    queryKey: ["/api/lists"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card className="my-lists-loading">
        <div className="p-4">Loading your lists...</div>
      </Card>
    );
  }

  return (
    <Card className="my-lists">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">My Lists</h3>
          <Link href="/create-list">
            <Button size="sm" variant="outline">
              <Plus size={16} className="mr-1" />
              Create
            </Button>
          </Link>
        </div>
        
        {lists.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <List size={48} className="mx-auto mb-2 opacity-50" />
            <p>No lists yet</p>
            <p className="text-sm">Start curating your favorite spots</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lists.slice(0, 3).map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div>
                    <h4 className="font-medium">{list.name}</h4>
                    <p className="text-sm text-gray-500">
                      {list.itemCount} {list.itemCount === 1 ? 'spot' : 'spots'}
                      {list.isPrivate ? ' • Private' : ' • Public'}
                    </p>
                  </div>
                  <Users size={16} className="text-gray-400" />
                </div>
              </Link>
            ))}
            {lists.length > 3 && (
              <Link href="/lists">
                <Button variant="ghost" className="w-full">
                  View all {lists.length} lists
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}