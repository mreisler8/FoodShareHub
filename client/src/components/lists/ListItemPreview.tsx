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
    <Card className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Rank Badge (if ranked) */}
          {isRanked && item.rank && (
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                #{item.rank}
              </div>
            </div>
          )}

          {/* Image */}
          {item.photo && !imageError && (
            <div className="flex-shrink-0">
              <img
                src={item.photo}
                alt={item.type === "dish" ? item.dish?.name : item.restaurant?.name}
                className="w-20 h-20 object-cover rounded-xl"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {item.type === "dish" ? (
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{item.dish?.name}</h4>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <Utensils className="h-4 w-4" />
                      {item.restaurant?.name}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{item.restaurant?.name}</h4>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {item.restaurant?.location || item.restaurant?.city || "Location not specified"}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <p className="text-gray-700 mt-2 text-sm leading-relaxed">{item.notes}</p>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-2 py-1 bg-gray-100 text-gray-700">
                        {tag}
                      </Badge>
                    ))}
                  </div>
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
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
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