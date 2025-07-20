import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MapPin, ChefHat, Utensils, MoreVertical, Edit, Trash2, MoveUp, MoveDown, Star } from "lucide-react";
import { ListItemData } from "./AddListItemModal";

interface ListItemPreviewProps {
  item: ListItemData & { id: string; rank?: number };
  isRanked?: boolean;
  totalItems?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, direction: "up" | "down") => void;
}

export function ListItemPreview({ 
  item, 
  isRanked = false, 
  totalItems = 0,
  onEdit, 
  onDelete, 
  onMove 
}: ListItemPreviewProps) {
  const [imageError, setImageError] = useState(false);

  const canMoveUp = isRanked && item.rank && item.rank > 1;
  const canMoveDown = isRanked && item.rank && item.rank < totalItems;

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Rank Badge (if ranked) */}
          {isRanked && item.rank && (
            <div className="flex-shrink-0">
              <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                #{item.rank}
              </Badge>
            </div>
          )}

          {/* Image */}
          {item.photo && !imageError && (
            <div className="flex-shrink-0">
              <img
                src={item.photo}
                alt={item.type === "dish" ? item.dish?.name : item.restaurant?.name}
                className="w-16 h-16 object-cover rounded-lg"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-2 mb-1">
                  {item.type === "dish" ? (
                    <ChefHat className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <Utensils className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <h3 className="font-medium text-lg truncate">
                    {item.type === "dish" ? item.dish?.name : item.restaurant?.name}
                  </h3>
                </div>

                {/* Restaurant name for dishes */}
                {item.type === "dish" && item.restaurant?.name && (
                  <p className="text-sm text-muted-foreground mb-1">
                    at {item.restaurant.name}
                  </p>
                )}

                {/* Location */}
                {item.restaurant?.location && (
                  <div className="flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {item.restaurant.location}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.notes}
                  </p>
                )}
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(item.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  
                  {isRanked && onMove && (
                    <>
                      {canMoveUp && (
                        <DropdownMenuItem onClick={() => onMove(item.id, "up")}>
                          <MoveUp className="h-4 w-4 mr-2" />
                          Move Up
                        </DropdownMenuItem>
                      )}
                      {canMoveDown && (
                        <DropdownMenuItem onClick={() => onMove(item.id, "down")}>
                          <MoveDown className="h-4 w-4 mr-2" />
                          Move Down
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(item.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}