import React from 'react';
import { RestaurantSearchComponent } from '@/components/shared/RestaurantSearchComponent';

interface SearchResult {
  id: string;
  name: string;
  location?: string;
  cuisine?: string;
  avgRating?: number;
  source: 'database' | 'google';
}

interface RestaurantSearchInputProps {
  onSelect: (restaurant: SearchResult) => void;
  selectedRestaurant?: SearchResult | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function RestaurantSearchInput({
  onSelect,
  selectedRestaurant,
  placeholder = "Search for a restaurant...",
  required = false,
  className = ""
}: RestaurantSearchInputProps) {
  // Use our enhanced RestaurantSearchComponent instead of custom implementation
  const handleSelect = (restaurant: any) => {
    // Convert to expected format
    const convertedRestaurant = {
      id: restaurant.id?.toString() || '',
      name: restaurant.name || '',
      location: restaurant.location || '',
      cuisine: restaurant.category || restaurant.cuisine || '',
      avgRating: restaurant.averageRating || 4.0,
      source: restaurant.source || 'database'
    };
    onSelect(convertedRestaurant);
  };

  return (
    <RestaurantSearchComponent
      onSelect={handleSelect}
      placeholder={placeholder}
      className={className}
      showLocationServices={true}
      autoRequestLocation={true}
    />
  );
}