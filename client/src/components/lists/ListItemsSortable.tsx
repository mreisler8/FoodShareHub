import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ListItemPreview } from "./ListItemPreview";
import { ListItemData } from "./AddListItemModal";

interface SortableListItem extends ListItemData {
  id: string;
  rank: number;
}

interface SortableItemWrapperProps {
  item: SortableListItem;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function SortableItemWrapper({ item, onEdit, onDelete }: SortableItemWrapperProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${isDragging ? "shadow-lg scale-105 z-50" : ""}`}
    >
      <div className="flex items-center space-x-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* List Item */}
        <div className="flex-1">
          <ListItemPreview
            item={item}
            isRanked={true}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

interface ListItemsSortableProps {
  items: SortableListItem[];
  onItemsChange: (items: SortableListItem[]) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ListItemsSortable({ 
  items, 
  onItemsChange, 
  onEdit, 
  onDelete 
}: ListItemsSortableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over?.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update ranks after reordering
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

      onItemsChange(updatedItems);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No items in your list yet</p>
        <p className="text-sm">Add restaurants or dishes to start building your list</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Your List ({items.length} items)</h3>
        <p className="text-sm text-muted-foreground">
          Drag items to reorder
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={items.map(item => item.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {items.map((item) => (
              <SortableItemWrapper
                key={item.id}
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}