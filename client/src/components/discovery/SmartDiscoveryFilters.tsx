import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Filter, 
  X, 
  ChefHat, 
  MapPin, 
  DollarSign, 
  Star, 
  Clock, 
  Users,
  Heart,
  Utensils,
  Navigation,
  Sparkles
} from 'lucide-react';
import { LocationService } from '@/services/locationService';

interface FilterState {
  cuisines: string[];
  location: {
    type: 'near-me' | 'city' | 'neighborhood' | null;
    value: string;
    radius: number; // km
    coordinates?: { lat: number; lng: number };
  };
  priceRange: number[]; // [min, max] 1-4 scale
  minRating: number;
  occasions: string[];
  dietaryOptions: string[];
  features: string[];
  sortBy: 'relevance' | 'rating' | 'distance' | 'popularity' | 'recent';
}

interface SmartDiscoveryFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const CUISINE_OPTIONS = [
  'Italian', 'Japanese', 'Mexican', 'Chinese', 'Thai', 'Indian', 'French', 'Mediterranean',
  'American', 'Korean', 'Vietnamese', 'Greek', 'Spanish', 'Lebanese', 'Turkish', 'Peruvian',
  'Ethiopian', 'Moroccan', 'Brazilian', 'German', 'British', 'Caribbean', 'Fusion'
];

const OCCASION_TAGS = [
  { id: 'date-night', label: 'Date Night', icon: Heart },
  { id: 'family-friendly', label: 'Family Friendly', icon: Users },
  { id: 'quick-bite', label: 'Quick Bite', icon: Clock },
  { id: 'celebration', label: 'Celebration', icon: Sparkles },
  { id: 'business-lunch', label: 'Business Lunch', icon: Utensils },
  { id: 'casual-dining', label: 'Casual Dining', icon: ChefHat },
  { id: 'fine-dining', label: 'Fine Dining', icon: Star },
  { id: 'brunch', label: 'Brunch', icon: Utensils },
  { id: 'late-night', label: 'Late Night', icon: Clock },
  { id: 'group-dining', label: 'Group Dining', icon: Users }
];

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher', 'Keto-Friendly'
];

const RESTAURANT_FEATURES = [
  'Outdoor Seating', 'Delivery', 'Takeout', 'Reservations', 'Live Music', 'Full Bar', 
  'Wine List', 'Happy Hour', 'Private Dining', 'Parking Available', 'Wheelchair Accessible'
];

export function SmartDiscoveryFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  isCollapsed = false,
  onToggleCollapse
}: SmartDiscoveryFiltersProps) {
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermission(permission.state);
      
      if (permission.state === 'granted') {
        const locationService = LocationService.getInstance();
        const location = await locationService.getCurrentLocation();
        if (location) {
          setUserLocation({ lat: location.lat, lng: location.lng });
        }
      }
    } catch (error) {
      console.log('Location permission check failed:', error);
    }
  };

  const enableNearMe = async () => {
    try {
      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();
      if (location) {
        setUserLocation({ lat: location.lat, lng: location.lng });
        onFiltersChange({
          ...filters,
          location: {
            type: 'near-me',
            value: 'Current Location',
            radius: filters.location.radius || 5,
            coordinates: { lat: location.lat, lng: location.lng }
          }
        });
        setLocationPermission('granted');
      }
    } catch (error) {
      setLocationPermission('denied');
    }
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: 'cuisines' | 'occasions' | 'dietaryOptions' | 'features', value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const hasActiveFilters = () => {
    return filters.cuisines.length > 0 ||
           filters.location.type !== null ||
           filters.priceRange[0] > 1 || filters.priceRange[1] < 4 ||
           filters.minRating > 0 ||
           filters.occasions.length > 0 ||
           filters.dietaryOptions.length > 0 ||
           filters.features.length > 0;
  };

  if (isCollapsed) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {hasActiveFilters() && (
                <Badge variant="secondary" className="text-xs">
                  {filters.cuisines.length + filters.occasions.length + filters.dietaryOptions.length + filters.features.length + (filters.location.type ? 1 : 0)} active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters() && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  Clear All
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onToggleCollapse}>
                Expand Filters
              </Button>
            </div>
          </div>
          
          {hasActiveFilters() && (
            <div className="flex flex-wrap gap-1 mt-3">
              {filters.cuisines.map(cuisine => (
                <Badge key={cuisine} variant="secondary" className="text-xs">
                  {cuisine}
                  <button 
                    onClick={() => toggleArrayFilter('cuisines', cuisine)}
                    className="ml-1 hover:bg-gray-300 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {filters.occasions.map(occasion => (
                <Badge key={occasion} variant="secondary" className="text-xs">
                  {OCCASION_TAGS.find(t => t.id === occasion)?.label || occasion}
                  <button 
                    onClick={() => toggleArrayFilter('occasions', occasion)}
                    className="ml-1 hover:bg-gray-300 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {filters.location.type && (
                <Badge variant="secondary" className="text-xs">
                  {filters.location.value}
                  <button 
                    onClick={() => updateFilter('location', { type: null, value: '', radius: 5 })}
                    className="ml-1 hover:bg-gray-300 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Smart Discovery Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters() && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            {onToggleCollapse && (
              <Button variant="outline" size="sm" onClick={onToggleCollapse}>
                Collapse
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">Location</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant={filters.location.type === 'near-me' ? 'default' : 'outline'}
              onClick={enableNearMe}
              disabled={locationPermission === 'denied'}
              className="flex items-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              Near Me
            </Button>
            <Input
              placeholder="City or neighborhood"
              value={filters.location.type === 'city' ? filters.location.value : ''}
              onChange={(e) => updateFilter('location', {
                type: e.target.value ? 'city' : null,
                value: e.target.value,
                radius: filters.location.radius || 5
              })}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm">Radius: {filters.location.radius || 5}km</span>
              <Slider
                value={[filters.location.radius || 5]}
                onValueChange={(value) => updateFilter('location', {
                  ...filters.location,
                  radius: value[0]
                })}
                max={50}
                min={1}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Cuisine Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            <span className="font-medium">Cuisine ({filters.cuisines.length} selected)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {CUISINE_OPTIONS.map(cuisine => (
              <div key={cuisine} className="flex items-center space-x-2">
                <Checkbox
                  id={`cuisine-${cuisine}`}
                  checked={filters.cuisines.includes(cuisine)}
                  onCheckedChange={() => toggleArrayFilter('cuisines', cuisine)}
                />
                <label 
                  htmlFor={`cuisine-${cuisine}`}
                  className="text-sm cursor-pointer hover:text-blue-600"
                >
                  {cuisine}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Occasions Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Perfect For ({filters.occasions.length} selected)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {OCCASION_TAGS.map(occasion => (
              <Button
                key={occasion.id}
                variant={filters.occasions.includes(occasion.id) ? 'default' : 'outline'}
                onClick={() => toggleArrayFilter('occasions', occasion.id)}
                className="flex items-center gap-2 justify-start h-auto py-2"
                size="sm"
              >
                <occasion.icon className="h-3 w-3" />
                <span className="text-xs">{occasion.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">Price Range</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">$</span>
            <Slider
              value={filters.priceRange}
              onValueChange={(value) => updateFilter('priceRange', value)}
              max={4}
              min={1}
              step={1}
              className="flex-1"
            />
            <span className="text-sm">$$$$</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Budget-Friendly</span>
            <span>Fine Dining</span>
          </div>
        </div>

        {/* Rating Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="font-medium">Minimum Rating</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Any</span>
            <Slider
              value={[filters.minRating]}
              onValueChange={(value) => updateFilter('minRating', value[0])}
              max={5}
              min={0}
              step={0.5}
              className="flex-1"
            />
            <span className="text-sm">5★</span>
          </div>
          <div className="text-center text-sm text-gray-600">
            {filters.minRating > 0 ? `${filters.minRating}+ stars` : 'Any rating'}
          </div>
        </div>

        {/* Dietary Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            <span className="font-medium">Dietary Options ({filters.dietaryOptions.length} selected)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DIETARY_OPTIONS.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`dietary-${option}`}
                  checked={filters.dietaryOptions.includes(option)}
                  onCheckedChange={() => toggleArrayFilter('dietaryOptions', option)}
                />
                <label 
                  htmlFor={`dietary-${option}`}
                  className="text-sm cursor-pointer hover:text-blue-600"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Restaurant Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">Features ({filters.features.length} selected)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {RESTAURANT_FEATURES.map(feature => (
              <div key={feature} className="flex items-center space-x-2">
                <Checkbox
                  id={`feature-${feature}`}
                  checked={filters.features.includes(feature)}
                  onCheckedChange={() => toggleArrayFilter('features', feature)}
                />
                <label 
                  htmlFor={`feature-${feature}`}
                  className="text-sm cursor-pointer hover:text-blue-600"
                >
                  {feature}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="space-y-3">
          <span className="font-medium">Sort By</span>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Most Relevant</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="distance">Nearest</SelectItem>
              <SelectItem value="popularity">Most Popular</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}