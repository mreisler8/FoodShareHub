import React from 'react';
import { RestaurantSearchComponent } from '@/components/shared/RestaurantSearchComponent';
import { Restaurant } from '@/types/restaurant';

interface RestaurantSearchInputProps {
  onSelect: (restaurant: Restaurant) => void;
  placeholder?: string;
  initialValue?: string;
}

export function RestaurantSearchInput({ onSelect, placeholder, initialValue }: RestaurantSearchInputProps) {
  return (
    <RestaurantSearchComponent
      onSelect={onSelect}
      placeholder={placeholder}
      initialValue={initialValue}
      showRecentSearches={true}
    />
  );
}