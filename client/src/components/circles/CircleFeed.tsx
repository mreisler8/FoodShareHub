import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, MapPin, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface CircleFeedItem {
  id: number;
  type: "list" | "post";
  title: string;
  description?: string;
  author: {
    id: number;
    name: string;
    username: string;
  };
  createdAt: string;
  metadata?: {
    restaurantCount?: number;
    rating?: number;
    restaurant?: {
      name: string;
      location: string;
    };
  };
}

interface CircleFeedProps {
  circleId: number;
  circleName: string;
}

export function CircleFeed({ circleId, circleName }: CircleFeedProps) {
  const { data: feedItems = [], isLoading } = useQuery<CircleFeedItem[]>({
    queryKey: [`/api/circles/${circleId}/feed`],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/feed`);
      if (!response.ok) throw new Error("Failed to fetch circle feed");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to share a list or post in {circleName}
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild>
              <Link href="/lists/create">Create List</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/posts/create">Share Experience</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <Badge variant="outline">
          {feedItems.length} item{feedItems.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {feedItems.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {item.author.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.author.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.type === 'list' ? 'List' : 'Post'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${item.type}s/${item.id}`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold">{item.title}</h3>
              {item.description && (
                <p className="text-muted-foreground">{item.description}</p>
              )}
              
              {item.metadata && (
                <div className="flex items-center gap-4 pt-2">
                  {item.metadata.restaurantCount !== undefined && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {item.metadata.restaurantCount} restaurant{item.metadata.restaurantCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {item.metadata.rating && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3" />
                      {item.metadata.rating}/5
                    </div>
                  )}
                  {item.metadata.restaurant && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {item.metadata.restaurant.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}