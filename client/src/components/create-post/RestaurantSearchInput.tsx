import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  category?: string;
  address?: string;
  thumbnailUrl?: string;
  avgRating?: number;
}

interface RestaurantSearchInputProps {
  onSelect: (restaurant: Restaurant) => void;
  placeholder?: string;
  value?: Restaurant | null;
}

export function RestaurantSearchInput({ onSelect, placeholder = "Search for a restaurant...", value }: RestaurantSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch restaurant search results
  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ['/api/search/unified', { q: debouncedQuery }],
    queryFn: async () => {
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      return data.restaurants || [];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(query.length >= 2);
  };

  const handleSelect = (restaurant: Restaurant) => {
    onSelect(restaurant);
    setSearchQuery(restaurant.name);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value?.name || searchQuery}
          onChange={handleInputChange}
          onFocus={() => setShowResults(searchQuery.length >= 2)}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching restaurants...
            </div>
          ) : restaurants && restaurants.length > 0 ? (
            <div className="py-2">
              {restaurants.slice(0, 5).map((restaurant) => (
                <button
                  key={restaurant.id}
                  onClick={() => handleSelect(restaurant)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {restaurant.name}
                      </div>
                      {restaurant.location && (
                        <div className="text-sm text-gray-500 truncate">
                          {restaurant.location}
                        </div>
                      )}
                    </div>
                    {restaurant.avgRating && (
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        ⭐ {restaurant.avgRating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : debouncedQuery.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              No restaurants found for "{debouncedQuery}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}