import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { RestaurantList } from "@shared/schema";

interface ListTagDisplayProps {
  lists: RestaurantList[];
  className?: string;
}

export function ListTagDisplay({ lists, className }: ListTagDisplayProps) {
  if (!lists || lists.length === 0) {
    return null;
  }

  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      <span className="mr-2">In lists:</span>
      <div className="flex flex-wrap gap-1 items-center">
        {lists.map((list) => (
          <Link key={list.id} href={`/lists/${list.id}`}>
            <Badge
              variant="secondary"
              className="hover:bg-accent hover:text-accent-foreground cursor-pointer text-xs"
            >
              {list.name}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}