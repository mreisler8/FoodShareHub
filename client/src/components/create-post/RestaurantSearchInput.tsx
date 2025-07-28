import React from 'react';
import { RestaurantSearchComponent } from '@/components/shared/RestaurantSearchComponent';

interface Restaurant {
  id: number;
  name: string;
  location: string;
  category?: string;
  priceRange?: string;
  imageUrl?: string;
  averageRating?: number;
  totalPosts?: number;
}

interface RestaurantSearchInputProps {
  onSelect: (restaurant: Restaurant) => void;
  placeholder?: string;
  className?: string;
}

export function RestaurantSearchInput({ onSelect, placeholder, className }: RestaurantSearchInputProps) {
  return (
    <RestaurantSearchComponent
      onSelect={onSelect}
      placeholder={placeholder}
      className={className}
      showLocationServices={true}
      autoRequestLocation={true}
    />
  );
}