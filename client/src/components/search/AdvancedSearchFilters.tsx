
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, DollarSign, Clock, Users, Tag, X } from 'lucide-react';

export interface SearchFilters {
  location?: string;
  radius?: number;
  priceRange?: string[];
  cuisines?: string[];
  tags?: string[];
  occasions?: string[];
  dietaryRestrictions?: string[];
  openNow?: boolean;
  rating?: number;
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClear: () => void;
}

const CUISINES = [
  'Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian', 'Thai', 'French',
  'American', 'Mediterranean', 'Korean', 'Vietnamese', 'Greek', 'Spanish'
];

const PRICE_RANGES = ['$', '$$', '$$$', '$$$$'];

const OCCASIONS = [
  'date-night', 'family-dinner', 'business-lunch', 'birthday', 'anniversary',
  'casual-hangout', 'special-occasion', 'quick-bite', 'brunch', 'late-night'
];

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'halal', 'kosher'
];

const POPULAR_TAGS = [
  'romantic', 'family-friendly', 'trendy', 'cozy', 'outdoor-seating',
  'great-view', 'live-music', 'takeout', 'delivery', 'reservation-required'
];

export function AdvancedSearchFilters({ 
  filters, 
  onFiltersChange, 
  onClear 
}: AdvancedSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilters(key, newArray);
  };

  const activeFiltersCount = Object.values(filters).filter(v => 
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null
  ).length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Less' : 'More'} Filters
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Location & Distance */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </Label>
          <Input
            placeholder="Enter city, neighborhood, or address..."
            value={filters.location || ''}
            onChange={(e) => updateFilters('location', e.target.value)}
          />
          {filters.location && (
            <div className="space-y-2">
              <Label className="text-sm">Radius: {filters.radius || 10} miles</Label>
              <Slider
                value={[filters.radius || 10]}
                onValueChange={([value]) => updateFilters('radius', value)}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Price Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Price Range
          </Label>
          <div className="flex gap-2">
            {PRICE_RANGES.map((price) => (
              <Button
                key={price}
                variant={filters.priceRange?.includes(price) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleArrayFilter('priceRange', price)}
              >
                {price}
              </Button>
            ))}
          </div>
        </div>

        {/* Occasions - Critical for Seeker Sam */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Occasions
          </Label>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.slice(0, isExpanded ? OCCASIONS.length : 5).map((occasion) => (
              <Button
                key={occasion}
                variant={filters.occasions?.includes(occasion) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleArrayFilter('occasions', occasion)}
                className="text-xs"
              >
                {occasion.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Cuisines - Critical for Explorer Alex */}
        <div className="space-y-3">
          <Label>Cuisine Types</Label>
          <div className="flex flex-wrap gap-2">
            {CUISINES.slice(0, isExpanded ? CUISINES.length : 6).map((cuisine) => (
              <Button
                key={cuisine}
                variant={filters.cuisines?.includes(cuisine) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleArrayFilter('cuisines', cuisine)}
                className="text-xs"
              >
                {cuisine}
              </Button>
            ))}
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            {/* Tags */}
            <div className="space-y-3">
              <Label>Popular Tags</Label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((tag) => (
                  <Button
                    key={tag}
                    variant={filters.tags?.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleArrayFilter('tags', tag)}
                    className="text-xs"
                  >
                    {tag.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-3">
              <Label>Dietary Options</Label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((diet) => (
                  <Button
                    key={diet}
                    variant={filters.dietaryRestrictions?.includes(diet) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleArrayFilter('dietaryRestrictions', diet)}
                    className="text-xs"
                  >
                    {diet.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-3">
              <Label>Minimum Rating: {filters.rating || 3.0}</Label>
              <Slider
                value={[filters.rating || 3.0]}
                onValueChange={([value]) => updateFilters('rating', value)}
                max={5}
                min={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Open Now */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="openNow"
                checked={filters.openNow || false}
                onCheckedChange={(checked) => updateFilters('openNow', checked)}
              />
              <Label htmlFor="openNow" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Open Now
              </Label>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
