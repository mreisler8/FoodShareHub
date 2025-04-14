import { RestaurantList } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Utensils, Tag, Users } from "lucide-react";

interface RestaurantListCardProps {
  list: RestaurantList;
  isCompact?: boolean;
}

export function RestaurantListCard({ list, isCompact = false }: RestaurantListCardProps) {
  return (
    <Link href={`/lists/${list.id}`} className="block">
      <Card className="h-full transition-all duration-200 hover:shadow-md">
        <CardHeader className={isCompact ? "p-4 pb-2" : "p-6 pb-3"}>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className={`text-primary font-heading ${isCompact ? "text-lg" : "text-xl"}`}>
                {list.name}
              </CardTitle>
              {!isCompact && (
                <CardDescription className="mt-1 line-clamp-2">
                  {list.description}
                </CardDescription>
              )}
            </div>
            <Badge variant="outline" className="flex items-center gap-1 ml-2">
              <Utensils className="h-3 w-3" />
              <span>{list.restaurantCount || 0}</span>
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className={isCompact ? "p-4 pt-0" : "p-6 pt-0"}>
          {list.tags && list.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {list.tags.slice(0, isCompact ? 2 : 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span>{tag}</span>
                </Badge>
              ))}
              {list.tags.length > (isCompact ? 2 : 3) && (
                <Badge variant="outline">+{list.tags.length - (isCompact ? 2 : 3)}</Badge>
              )}
            </div>
          )}
          
          {list.hubId && !isCompact && (
            <div className="flex items-center mt-3 text-sm text-neutral-500">
              <Users className="h-4 w-4 mr-1" />
              <span>Shared with {list.hubName || "a circle"}</span>
            </div>
          )}
          
          {!isCompact && list.creator && (
            <div className="flex items-center mt-2 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                {list.creator.profilePicture ? (
                  <img 
                    src={list.creator.profilePicture} 
                    alt={list.creator.name} 
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-xs">
                    {list.creator.name.charAt(0)}
                  </div>
                )}
                <span>Created by {list.creator.name}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}