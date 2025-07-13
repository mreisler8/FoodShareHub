import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Edit, Trash2, Clock, ThumbsUp, ThumbsDown, MessageSquare, Star, DollarSign
} from "lucide-react";
import { RestaurantListItemWithDetails } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { ItemComments } from "./ItemComments";

interface ListItemCardProps {
  data: RestaurantListItemWithDetails;
  onEdit: (itemId: number) => void;
  onDelete: (itemId: number) => void;
  isOptimistic?: boolean;
}

export function ListItemCard({ data: item, onEdit, onDelete, isOptimistic = false }: ListItemCardProps) {
  const { user } = useAuth();
  const canEdit = user && item.addedById === user.id;

  const handleDelete = () => {
    if (window.confirm("Delete this item?")) {
      onDelete(item.id);
    }
  };

  return (
    <Card className={`overflow-hidden ${isOptimistic ? 'opacity-70 border-dashed' : ''}`}>
      <div className="flex flex-col h-full">
        {/* Optimistic loading indicator */}
        {isOptimistic && (
          <div className="bg-blue-50 px-3 py-1 text-xs text-blue-600 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
            Saving...
          </div>
        )}
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg font-heading">
                {item.restaurant?.name}
              </CardTitle>
              <div className="flex items-center text-sm text-neutral-500 mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{item.restaurant?.location}</span>
                <span className="mx-2">•</span>
                <span>{item.restaurant?.category}</span>
                <span className="mx-2">•</span>
                <span>{item.restaurant?.priceRange}</span>
              </div>
            </div>
            
            {/* Edit/Delete Controls */}
            {canEdit && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(item.id)}
                  className="h-8 w-8 p-0"
                  title="Edit item"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Rating and Price Assessment */}
          <div className="flex items-center flex-wrap gap-4 mb-3">
            {item.rating && (
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="text-sm text-neutral-600">
                  {item.rating}/5
                </span>
              </div>
            )}
            
            {item.priceAssessment && (
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-blue-600 mr-1" />
                <span className={`text-sm px-2 py-1 rounded-full text-xs font-medium ${
                  item.priceAssessment === 'Great value' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  item.priceAssessment === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {item.priceAssessment}
                </span>
              </div>
            )}
          </div>
          
          {/* What I liked / disliked */}
          {(item.liked || item.disliked) && (
            <div className="space-y-2 mb-3">
              {item.liked && (
                <div className="flex items-start gap-2">
                  <ThumbsUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-neutral-700">{item.liked}</p>
                </div>
              )}
              {item.disliked && (
                <div className="flex items-start gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-neutral-700">{item.disliked}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Notes */}
          {item.notes && (
            <div className="flex items-start gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-neutral-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-neutral-700">{item.notes}</p>
            </div>
          )}
          
          {/* Added by info */}
          <div className="flex items-center text-xs text-neutral-500 mt-4 pt-3 border-t border-neutral-100">
            <Avatar className="h-5 w-5 mr-2">
              <AvatarImage src={item.addedBy?.profilePicture || undefined} alt={item.addedBy?.name || "User"} />
              <AvatarFallback>{item.addedBy?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <span>Added by {item.addedBy?.name || "anonymous"}</span>
            {item.addedAt && (
              <span className="ml-2">
                • {new Date(item.addedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          
          {/* Item Comments */}
          <ItemComments 
            itemId={item.id}
            restaurantName={item.restaurant?.name || "this restaurant"}
          />
        </CardContent>
      </div>
    </Card>
  );
}