import React from 'react';
import { RestaurantSearchComponent } from '@/components/shared/RestaurantSearchComponent';
import { SearchResult } from '@/services/searchService';

interface RestaurantSearchInputProps {
  onSelect: (restaurant: SearchResult) => void;
  placeholder?: string;
  value?: SearchResult | null;
}

export function RestaurantSearchInput({ onSelect, placeholder, value }: RestaurantSearchInputProps) {
  return (
    <RestaurantSearchComponent
      onSelect={onSelect}
      placeholder={placeholder}
      value={value}
      showRecentSearches={true}
    />
  );
}