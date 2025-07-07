import { Link } from "wouter";
import { RestaurantList } from "@shared/schema";
import { MapPin, Users, Eye, Heart } from "lucide-react";

interface RestaurantListCardProps {
  list: RestaurantList;
}

export function RestaurantListCard({ list }: RestaurantListCardProps) {
  return (
    <Link href={`/lists/${list.id}`}>
      <div className="card card-hover p-6 cursor-pointer bg-card border border-border">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-foreground truncate">{list.name}</h3>
            {list.description && (
              <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{list.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground ml-4">
            <Eye className="h-4 w-4" />
            <span>{list.viewCount || 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            {list.primaryLocation && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{list.primaryLocation}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span className="capitalize">{list.visibility}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span>{list.saveCount || 0}</span>
          </div>
        </div>

        {list.tags && list.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {list.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {list.tags.length > 3 && (
              <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                +{list.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}