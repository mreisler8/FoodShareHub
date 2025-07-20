import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Users, Eye, Globe, Lock, ChefHat, Utensils } from "lucide-react";
import { ListItemData } from "./AddListItemModal";
import { ShareDestination } from "./ShareListDestinationPicker";

interface ListPreviewData {
  title: string;
  description?: string;
  coverImage?: string;
  tags: string[];
  items: (ListItemData & { id: string; rank?: number })[];
  isRanked: boolean;
  shareDestination: ShareDestination;
  author?: {
    name: string;
    avatar?: string;
  };
}

interface ListPreviewCardProps {
  listData: ListPreviewData;
  className?: string;
}

export function ListPreviewCard({ listData, className = "" }: ListPreviewCardProps) {
  const { title, description, coverImage, tags, items, isRanked, shareDestination, author } = listData;

  const getVisibilityIcon = () => {
    switch (shareDestination.type) {
      case "public": return <Globe className="h-3 w-3" />;
      case "circle": return <Users className="h-3 w-3" />;
      case "profile": return <Eye className="h-3 w-3" />;
      case "private": return <Lock className="h-3 w-3" />;
      default: return null;
    }
  };

  const getVisibilityText = () => {
    switch (shareDestination.type) {
      case "public": return "Public";
      case "circle": return shareDestination.circleName || "Circle";
      case "profile": return "Profile";
      case "private": return "Private";
      default: return "";
    }
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      {/* Cover Image */}
      {coverImage && (
        <div className="relative">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-black/70 text-white border-0">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          {isRanked && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-black/70 text-white border-0">
                Ranked List
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        {/* Author Info */}
        {author && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={author.avatar} />
              <AvatarFallback className="text-xs">
                {author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{author.name}</span>
            <div className="flex items-center gap-1 ml-auto">
              {getVisibilityIcon()}
              <span className="text-xs text-muted-foreground">
                {getVisibilityText()}
              </span>
            </div>
          </div>
        )}

        {/* Title and Description */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold line-clamp-2">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Item Preview */}
        {items.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              {isRanked ? "Top items:" : "Items in this list:"}
            </div>
            
            {items.slice(0, 3).map((item, index) => (
              <div key={item.id} className="flex items-center gap-3">
                {isRanked && (
                  <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {item.rank || index + 1}
                  </Badge>
                )}
                
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.type === "dish" ? (
                    <ChefHat className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <Utensils className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {item.type === "dish" ? item.dish?.name : item.restaurant?.name}
                    </div>
                    {item.type === "dish" && item.restaurant?.name && (
                      <div className="text-xs text-muted-foreground truncate">
                        at {item.restaurant.name}
                      </div>
                    )}
                    {item.restaurant?.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-2 w-2" />
                        <span className="truncate">{item.restaurant.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {item.photo && (
                  <img
                    src={item.photo}
                    alt={item.type === "dish" ? item.dish?.name : item.restaurant?.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                )}
              </div>
            ))}
            
            {items.length > 3 && (
              <div className="text-center py-2">
                <span className="text-sm text-muted-foreground">
                  +{items.length - 3} more {items.length - 3 === 1 ? 'item' : 'items'}
                </span>
              </div>
            )}
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No items added yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}