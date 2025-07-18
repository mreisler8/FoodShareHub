
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { SearchResult } from '@/services/searchService';
import { SearchService } from '@/services/searchService';
import { useDebounce } from '@/hooks/use-debounce';
import { MapPin, Star, Clock } from 'lucide-react';

interface RestaurantSearchComponentProps {
  onSelect: (restaurant: SearchResult) => void;
  placeholder?: string;
  value?: SearchResult | null;
  className?: string;
  showRecentSearches?: boolean;
}

export function RestaurantSearchComponent({
  onSelect,
  placeholder = "Search restaurants...",
  value,
  className = "",
  showRecentSearches = true
}: RestaurantSearchComponentProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  const searchService = SearchService.getInstance();

  useEffect(() => {
    if (showRecentSearches) {
      searchService.getRecentSearches().then(data => {
        setRecentSearches(data.recent);
      });
    }
  }, [showRecentSearches]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsLoading(true);
      searchService.searchRestaurants(debouncedQuery)
        .then(restaurants => {
          setResults(restaurants);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Search error:', error);
          setResults([]);
          setIsLoading(false);
        });
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  const handleSelect = (restaurant: SearchResult) => {
    onSelect(restaurant);
    setShowResults(false);
    setQuery('');
    searchService.recordSearch(restaurant.name);
  };

  const handleRecentSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    setShowResults(true);
  };

  return (
    <div className={`relative ${className}`}>
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        className="w-full"
      />
      
      {showResults && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((restaurant) => (
                <button
                  key={restaurant.id}
                  onClick={() => handleSelect(restaurant)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{restaurant.name}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      {restaurant.location && (
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {restaurant.location}
                        </span>
                      )}
                      {restaurant.avgRating && (
                        <span className="flex items-center">
                          <Star className="w-3 h-3 mr-1 text-yellow-400" />
                          {restaurant.avgRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">No restaurants found</div>
          ) : showRecentSearches && recentSearches.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearch(search)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{search}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
