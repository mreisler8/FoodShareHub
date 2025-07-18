import React from 'react';
import { RestaurantSearchComponent } from '@/components/shared/RestaurantSearchComponent';
import { SearchResult } from '@/services/searchService';

interface RestaurantSearchInputProps {
  onSelect: (restaurant: SearchResult) => void;
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