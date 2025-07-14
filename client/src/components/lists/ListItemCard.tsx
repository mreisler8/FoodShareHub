import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Edit, Trash2, Clock, ThumbsUp, ThumbsDown, MessageSquare, Star, DollarSign, Utensils
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
    <Card className={`group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 ${isOptimistic ? 'opacity-70 border-dashed border border-blue-200' : 'border border-neutral-200'}`}>
      <div className="flex flex-col h-full bg-white rounded-xl">
        {/* Optimistic loading indicator */}
        {isOptimistic && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 flex items-center border-b border-blue-100">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-3"></div>
            <span className="text-xs font-medium text-blue-700">Saving your recommendation...</span>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="h-5 w-5 text-neutral-600" />
                <CardTitle className="text-xl font-heading font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors">
                  {item.restaurant?.name}
                </CardTitle>
              </div>
              <div className="flex items-center text-sm text-neutral-500 flex-wrap gap-2">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{item.restaurant?.location}</span>
                </div>
                <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                <span className="text-neutral-600 font-medium">{item.restaurant?.category}</span>
                <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                  {item.restaurant?.priceRange}
                </span>
              </div>
            </div>
            
            {/* Edit/Delete Controls */}
            {canEdit && (
              <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(item.id)}
                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                  title="Edit item"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-neutral-400 hover:text-red-500 hover:bg-red-50"
                  title="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-4">
          {/* Rating and Price Assessment */}
          <div className="flex items-center flex-wrap gap-3">
            {item.rating && (
              <div className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-full">
                <Star className="h-4 w-4 text-yellow-500 mr-1.5 fill-current" />
                <span className="text-sm font-medium text-yellow-700">
                  {item.rating}/5
                </span>
              </div>
            )}
            
            {item.priceAssessment && (
              <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                item.priceAssessment === 'Great value' ? 'bg-emerald-50 text-emerald-700' :
                item.priceAssessment === 'Fair' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              }`}>
                <DollarSign className="h-4 w-4 mr-1.5" />
                {item.priceAssessment}
              </div>
            )}
          </div>
          
          {/* What I liked / disliked */}
          {(item.liked || item.disliked) && (
            <div className="space-y-3">
              {item.liked && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <ThumbsUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">What I Loved</span>
                    <p className="text-sm text-blue-800 mt-1">{item.liked}</p>
                  </div>
                </div>
              )}
              {item.disliked && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <ThumbsDown className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Could Be Better</span>
                    <p className="text-sm text-red-800 mt-1">{item.disliked}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Notes */}
          {item.notes && (
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Notes</span>
                  <p className="text-sm text-neutral-700 mt-1 leading-relaxed">{item.notes}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Must Try Dishes */}
          {item.mustTryDishes && item.mustTryDishes.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Must Try</span>
              <div className="flex flex-wrap gap-2">
                {item.mustTryDishes.map((dish, index) => (
                  <span key={index} className="px-3 py-1 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 rounded-full text-xs font-medium">
                    {dish}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Added by info */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
            <div className="flex items-center text-xs text-neutral-500">
              <Avatar className="h-6 w-6 mr-2 border border-neutral-200">
                <AvatarImage src={item.addedBy?.profilePicture || undefined} alt={item.addedBy?.name || "User"} />
                <AvatarFallback className="text-xs">{item.addedBy?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-neutral-600">{item.addedBy?.name || "anonymous"}</span>
            </div>
            {item.addedAt && (
              <span className="text-xs text-neutral-400">
                {new Date(item.addedAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: new Date(item.addedAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
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