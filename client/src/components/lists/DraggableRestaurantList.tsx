import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, MapPin, X, Edit } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface Restaurant {
  id: number;
  name: string;
  location: string;
  category: string;
  priceRange: string;
  imageUrl?: string;
  averageRating?: number;
  totalPosts?: number;
}

interface ListItem {
  id: string;
  restaurant: Restaurant;
  notes?: string;
  personalRating?: number;
  rank: number;
}

interface DraggableRestaurantListProps {
  items: ListItem[];
  onItemsChange: (items: ListItem[]) => void;
  onRemoveItem: (itemId: string) => void;
}

interface SortableItemProps {
  item: ListItem;
  onUpdateItem: (itemId: string, updates: Partial<ListItem>) => void;
  onRemoveItem: (itemId: string) => void;
  rank: number;
}

function SortableItem({ item, onUpdateItem, onRemoveItem, rank }: SortableItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingNotes, setEditingNotes] = useState(item.notes || "");
  const [editingRating, setEditingRating] = useState(item.personalRating || 0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveEdit = () => {
    onUpdateItem(item.id, {
      notes: editingNotes,
      personalRating: editingRating > 0 ? editingRating : undefined,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditingNotes(item.notes || "");
    setEditingRating(item.personalRating || 0);
    setIsEditing(false);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${isDragging ? "shadow-lg scale-105 z-50" : "hover:shadow-md"}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Rank Badge */}
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full font-semibold text-sm">
            {rank}
          </div>

          {/* Restaurant Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                {item.restaurant.imageUrl ? (
                  <img 
                    src={item.restaurant.imageUrl} 
                    alt={item.restaurant.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">
                      {item.restaurant.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{item.restaurant.name}</h4>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{item.restaurant.location}</span>
                  <Badge variant="secondary" className="text-xs">
                    {item.restaurant.category}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Personal Rating */}
            {!isEditing && item.personalRating && (
              <div className="flex items-center space-x-1 mb-2">
                <span className="text-sm font-medium">My Rating:</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= item.personalRating!
                          ? "text-yellow-400 fill-current"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {!isEditing && item.notes && (
              <div className="mb-2">
                <span className="text-sm font-medium">Notes:</span>
                <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
              </div>
            )}

            {/* Edit Form */}
            {isEditing && (
              <div className="space-y-3 mb-3">
                <div>
                  <label className="text-sm font-medium">Personal Rating</label>
                  <div className="flex items-center space-x-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setEditingRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= editingRating
                              ? "text-yellow-400 fill-current"
                              : "text-muted-foreground hover:text-yellow-400"
                          }`}
                        />
                      </button>
                    ))}
                    <button
                      onClick={() => setEditingRating(0)}
                      className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Add your thoughts about this restaurant..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemoveItem(item.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DraggableRestaurantList({ items, onItemsChange, onRemoveItem }: DraggableRestaurantListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update ranks
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
      
      onItemsChange(updatedItems);
    }
  };

  const handleUpdateItem = (itemId: string, updates: Partial<ListItem>) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    onItemsChange(updatedItems);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="h-8 w-8" />
        </div>
        <h3 className="font-semibold mb-2">No restaurants added yet</h3>
        <p className="text-sm">Search and add restaurants above to start building your list</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={onRemoveItem}
              rank={index + 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}