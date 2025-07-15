import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Users, List, Search, Plus, Heart } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function EmptyFeed() {
  const { data: suggestedCircles } = useQuery({
    queryKey: ['/api/circles/suggested'],
    queryFn: async () => {
      // Mock data for suggested circles
      return [
        {
          id: 1,
          name: "NYC Foodies",
          description: "Hidden gems in the big apple",
          memberCount: 234,
          tags: ["NYC", "Hidden Gems"]
        },
        {
          id: 2,
          name: "Michelin Hunters",
          description: "Chasing stars across the globe",
          memberCount: 89,
          tags: ["Michelin", "Fine Dining"]
        },
        {
          id: 3,
          name: "Brunch Squad",
          description: "Weekend brunch adventures",
          memberCount: 156,
          tags: ["Brunch", "Weekend"]
        }
      ];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: featuredLists } = useQuery({
    queryKey: ['/api/lists/featured'],
    queryFn: async () => {
      // Mock data for featured lists
      return [
        {
          id: 1,
          name: "Toronto's Best Ramen",
          description: "Authentic bowls across the city",
          createdBy: "Sarah Chen",
          restaurantCount: 12,
          saveCount: 89
        },
        {
          id: 2,
          name: "Date Night Spots",
          description: "Romantic restaurants for special occasions",
          createdBy: "Mike Rodriguez",
          restaurantCount: 8,
          saveCount: 156
        }
      ];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const circles = suggestedCircles || [];
  const lists = featuredLists || [];

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="p-6 text-center">
          <div className="mb-4">
            <Heart className="h-12 w-12 mx-auto text-blue-500 mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Circles!
            </h2>
            <p className="text-gray-600">
              Follow some foodie travelers to get personalized recommendations
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/discover/people">
              <Button className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Find People to Follow
              </Button>
            </Link>
            <Link href="/discover">
              <Button variant="outline" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Explore
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Suggested Circles */}
      {circles.length > 0 && (
        <Card className="bg-white border border-neutral-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Popular Circles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {circles.map((circle) => (
                <Card key={circle.id} className="border border-neutral-200 hover:border-neutral-300 transition-colors">
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{circle.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{circle.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {circle.memberCount} members
                      </span>
                      <Link href={`/circles/${circle.id}`}>
                        <Button size="sm" variant="outline">
                          Join Circle
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="text-center">
              <Link href="/circles">
                <Button variant="outline" size="sm">
                  View All Circles
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Featured Lists */}
      {lists.length > 0 && (
        <Card className="bg-white border border-neutral-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <List className="h-5 w-5" />
              Featured Lists
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {lists.map((list) => (
                <Card key={list.id} className="border border-neutral-200 hover:border-neutral-300 transition-colors">
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{list.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{list.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <span>by {list.createdBy}</span>
                      <span>{list.restaurantCount} restaurants</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {list.saveCount} saves
                      </span>
                      <Link href={`/lists/${list.id}`}>
                        <Button size="sm" variant="outline">
                          View List
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="text-center">
              <Link href="/lists">
                <Button variant="outline" size="sm">
                  View All Lists
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Create First List CTA */}
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6 text-center">
          <Plus className="h-10 w-10 mx-auto text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Create Your First List
          </h3>
          <p className="text-gray-600 mb-4">
            Share your favorite restaurants and hidden gems with the community
          </p>
          <Link href="/lists/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create List
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}