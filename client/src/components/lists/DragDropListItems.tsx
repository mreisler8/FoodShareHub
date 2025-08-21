import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GripVertical, 
  MapPin, 
  Star, 
  Trash2, 
  ArrowUp, 
  ArrowDown 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestaurantItem {
  id: string;
  name: string;
  location?: string;
  rating?: number;
  position: number;
  googlePlaceId?: string;
  cuisine?: string;
  notes?: string;
}

interface DragDropListItemsProps {
  items: RestaurantItem[];
  onReorder: (newItems: RestaurantItem[]) => void;
  onRemove?: (itemId: string) => void;
  className?: string;
  enableFallbackControls?: boolean; // For accessibility/mobile fallback
}

// Individual sortable item component
function SortableRestaurantItem({ 
  item, 
  isOverlay = false, 
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  enableFallbackControls = false
}: {
  item: RestaurantItem;
  isOverlay?: boolean;
  onRemove?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  enableFallbackControls?: boolean;
}) {
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

  const isTouchDevice = 'ontouchstart' in window;

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "mb-2 transition-all duration-200",
        isDragging && "opacity-50 scale-95 shadow-lg",
        isOverlay && "shadow-2xl rotate-2 bg-white",
        !isDragging && !isOverlay && "hover:shadow-md"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div 
            {...attributes} 
            {...listeners}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded cursor-grab active:cursor-grabbing",
              "hover:bg-gray-100 touch-manipulation",
              isTouchDevice && "p-2" // Larger touch target
            )}
            style={{ touchAction: 'none' }} // Prevent scrolling while dragging
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>

          {/* Restaurant Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{item.name}</h4>
              {item.rating && (
                <div className="flex items-center gap-1 text-xs text-yellow-600">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{item.rating}</span>
                </div>
              )}
            </div>
            
            {item.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{item.location}</span>
              </div>
            )}
            
            {item.cuisine && (
              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                {item.cuisine}
              </span>
            )}
            
            {item.notes && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.notes}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Fallback Controls for Accessibility/Mobile */}
            {enableFallbackControls && (
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMoveUp?.(item.id)}
                  disabled={!canMoveUp}
                  className="h-6 w-6 p-0"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMoveDown?.(item.id)}
                  disabled={!canMoveDown}
                  className="h-6 w-6 p-0"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DragDropListItems({ 
  items, 
  onReorder, 
  onRemove, 
  className,
  enableFallbackControls = false 
}: DragDropListItemsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<RestaurantItem | null>(null);
  
  // Enhanced sensors for better mobile support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long press to activate on mobile
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const item = items.find(item => item.id === active.id);
    setDraggedItem(item || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over?.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update positions
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        position: index + 1
      }));
      
      onReorder(updatedItems);
    }

    setActiveId(null);
    setDraggedItem(null);
  };

  // Fallback move functions for accessibility
  const handleMoveUp = (id: string) => {
    const currentIndex = items.findIndex(item => item.id === id);
    if (currentIndex > 0) {
      const newItems = arrayMove(items, currentIndex, currentIndex - 1);
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        position: index + 1
      }));
      onReorder(updatedItems);
    }
  };

  const handleMoveDown = (id: string) => {
    const currentIndex = items.findIndex(item => item.id === id);
    if (currentIndex < items.length - 1) {
      const newItems = arrayMove(items, currentIndex, currentIndex + 1);
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        position: index + 1
      }));
      onReorder(updatedItems);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No restaurants added yet.</p>
        <p className="text-sm">Search and add restaurants to build your list!</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={items.map(item => item.id)} 
          strategy={verticalListSortingStrategy}
        >
          {items.map((item, index) => (
            <SortableRestaurantItem
              key={item.id}
              item={item}
              onRemove={onRemove}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              enableFallbackControls={enableFallbackControls}
            />
          ))}
        </SortableContext>

        {/* Drag Overlay for better visual feedback */}
        <DragOverlay>
          {activeId && draggedItem ? (
            <SortableRestaurantItem
              item={draggedItem}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 <strong>Tip:</strong> {
            'ontouchstart' in window 
              ? "Long press and drag to reorder restaurants"
              : "Drag restaurants to reorder them"
          }
          {enableFallbackControls && " or use the arrow buttons"}
        </p>
      </div>
    </div>
  );
}

export default DragDropListItems;