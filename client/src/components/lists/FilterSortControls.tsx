import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  X, 
  Star, 
  MapPin, 
  ChefHat 
} from 'lucide-react';

interface FilterSortControlsProps {
  stats: {
    totalItems: number;
    avgRating: number;
    cuisines: string[];
    cities: string[];
  };
  onSortChange: (sort: string) => void;
  onFilterChange: (filters: { cuisine?: string; city?: string }) => void;
  currentSort: string;
  currentFilters: { cuisine?: string; city?: string };
}

export function FilterSortControls({
  stats,
  onSortChange,
  onFilterChange,
  currentSort,
  currentFilters
}: FilterSortControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClearFilters = () => {
    onFilterChange({});
  };

  const formatRating = (rating: number) => {
    return rating ? rating.toFixed(1) : '0.0';
  };

  const hasActiveFilters = currentFilters.cuisine || currentFilters.city;

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-600">
                  Avg Rating: <span className="font-medium">{formatRating(stats.avgRating)}</span>
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{stats.totalItems}</span> restaurants
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {isExpanded ? 'Hide' : 'Show'} Filters
              {hasActiveFilters && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter & Sort Controls */}
      {isExpanded && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sort by</label>
                <Select value={currentSort} onValueChange={onSortChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="position">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Default Order
                      </div>
                    </SelectItem>
                    <SelectItem value="rating">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4" />
                        Rating (High to Low)
                      </div>
                    </SelectItem>
                    <SelectItem value="rating_asc">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4" />
                        Rating (Low to High)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter by Cuisine */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <ChefHat className="h-4 w-4 inline mr-1" />
                  Cuisine
                </label>
                <Select 
                  value={currentFilters.cuisine || 'all'} 
                  onValueChange={(value) => 
                    onFilterChange({ 
                      ...currentFilters, 
                      cuisine: value === 'all' ? undefined : value 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cuisines</SelectItem>
                    {stats.cuisines.map((cuisine) => (
                      <SelectItem key={cuisine} value={cuisine}>
                        {cuisine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter by City */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  City
                </label>
                <Select 
                  value={currentFilters.city || 'all'} 
                  onValueChange={(value) => 
                    onFilterChange({ 
                      ...currentFilters, 
                      city: value === 'all' ? undefined : value 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {stats.cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 opacity-0">
                  Actions
                </label>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="w-full flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}