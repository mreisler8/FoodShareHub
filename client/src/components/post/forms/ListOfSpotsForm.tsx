import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Search, 
  Plus, 
  GripVertical, 
  X, 
  MapPin, 
  Star,
  Loader2,
  Eye
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import { VisibilitySelector } from '@/components/VisibilitySelector';

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  cuisine?: string;
  rating?: number;
  source: 'database' | 'google';
}

interface ListRestaurant extends Restaurant {
  rank: number;
  personalRating?: number;
  notes?: string;
}

interface ListOfSpotsFormProps {
  onSubmit: (data: any) => void;
  onPreview?: (data: any) => void;
  isLoading?: boolean;
  className?: string;
  initialData?: any;
  onStateChange?: (state: any) => void;
}

interface SortableRestaurantProps {
  restaurant: ListRestaurant;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ListRestaurant>) => void;
}

function SortableRestaurant({ restaurant, onRemove, onUpdate }: SortableRestaurantProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: restaurant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{restaurant.name}</span>
            <Badge variant="outline" className="text-xs">
              #{restaurant.rank}
            </Badge>
          </div>
          
          {restaurant.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {restaurant.location}
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs">Your Rating:</Label>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => onUpdate(restaurant.id, { personalRating: star })}
                    className="p-0.5"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= (restaurant.personalRating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <Input
            placeholder="Add a note about this spot..."
            value={restaurant.notes || ''}
            onChange={(e) => onUpdate(restaurant.id, { notes: e.target.value })}
            className="mt-2 text-sm"
          />
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(restaurant.id)}
          className="flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

export function ListOfSpotsForm({ 
  onSubmit, 
  onPreview, 
  isLoading, 
  className = '', 
  initialData = {},
  onStateChange
}: ListOfSpotsFormProps) {
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState<ListRestaurant[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibilitySettings, setVisibilitySettings] = useState({
    public: true,
    followers: false,
    circleIds: [] as number[]
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Restaurant search query - using standardized homepage search infrastructure
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['/api/search/unified', debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`);
      const data = await response.json();
      
      // Standardize restaurant results to match PostModal interface
      const restaurants = (data.restaurants || []).map((restaurant: any) => ({
        id: restaurant.id?.toString() || '',
        name: restaurant.name || '',
        location: restaurant.location || restaurant.address || '',
        cuisine: restaurant.cuisine || restaurant.category || '',
        rating: restaurant.avgRating || 0,
        source: restaurant.source || 'database'
      }));
      
      return restaurants;
    },
  });

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setRestaurants((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update ranks
        return newItems.map((item, index) => ({
          ...item,
          rank: index + 1
        }));
      });
    }
  };

  const addRestaurant = (restaurant: Restaurant) => {
    const newRestaurant: ListRestaurant = {
      ...restaurant,
      rank: restaurants.length + 1,
      personalRating: 0,
      notes: ''
    };
    setRestaurants([...restaurants, newRestaurant]);
    setSearchQuery('');
    setShowSearch(false);
  };

  const removeRestaurant = (id: string) => {
    setRestaurants(prev => 
      prev.filter(r => r.id !== id)
         .map((r, index) => ({ ...r, rank: index + 1 }))
    );
  };

  const updateRestaurant = (id: string, updates: Partial<ListRestaurant>) => {
    setRestaurants(prev =>
      prev.map(r => r.id === id ? { ...r, ...updates } : r)
    );
  };

  const handleSubmit = () => {
    const formData = {
      postType: 'list',
      listName,
      description,
      restaurants,
      visibility: visibilitySettings,
      metadata: {
        listType: 'spots',
        restaurantCount: restaurants.length,
        averageRating: restaurants.reduce((sum, r) => sum + (r.personalRating || 0), 0) / restaurants.length
      }
    };
    onSubmit(formData);
  };

  const handlePreview = () => {
    if (!canSubmit || !onPreview) return;
    
    const formData = {
      postType: 'list',
      listName,
      description,
      restaurants,
      visibility: visibilitySettings,
      metadata: {
        listType: 'spots',
        restaurantCount: restaurants.length,
        averageRating: restaurants.reduce((sum, r) => sum + (r.personalRating || 0), 0) / restaurants.length
      }
    };
    onPreview(formData);
  };

  const canSubmit = listName.trim() && restaurants.length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="listName">List Name *</Label>
          <Input
            id="listName"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g. Best Pizza in NYC"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell people what makes this list special..."
            className="mt-1"
            rows={3}
          />
        </div>
      </div>

      {/* Restaurant Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Restaurants ({restaurants.length})</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Restaurant
          </Button>
        </div>

        {/* Search Interface */}
        {showSearch && (
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for restaurants..."
                className="pl-10"
              />
            </div>
            
            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.slice(0, 5).map((restaurant: Restaurant) => (
                  <div
                    key={restaurant.id}
                    className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer"
                    onClick={() => addRestaurant(restaurant)}
                  >
                    <div>
                      <div className="font-medium">{restaurant.name}</div>
                      {restaurant.location && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {restaurant.location}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Sortable Restaurant List */}
        {restaurants.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={restaurants.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {restaurants.map((restaurant) => (
                  <SortableRestaurant
                    key={restaurant.id}
                    restaurant={restaurant}
                    onRemove={removeRestaurant}
                    onUpdate={updateRestaurant}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Visibility Settings */}
      <div className="space-y-2">
        <Label>Visibility</Label>
        <VisibilitySelector
          value={visibilitySettings}
          onChange={setVisibilitySettings}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onPreview && (
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!canSubmit}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating List...
            </>
          ) : (
            'Create List of Spots'
          )}
        </Button>
      </div>
    </div>
  );
}