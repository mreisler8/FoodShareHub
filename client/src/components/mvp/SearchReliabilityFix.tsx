import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SearchReliabilityFixProps {
  placeholder?: string;
  onResultSelect?: (result: any) => void;
  searchType?: 'restaurants' | 'users' | 'all';
  className?: string;
}

/**
 * MVP-Ready Search Component with Enhanced Reliability
 * Standardized across all search implementations
 */
export function SearchReliabilityFix({
  placeholder = "Search restaurants...",
  onResultSelect,
  searchType = 'restaurants',
  className
}: SearchReliabilityFixProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Reliable search query with proper error handling
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['/api/search', searchType, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [] };

      const endpoint = searchType === 'all' 
        ? `/api/search/unified?q=${encodeURIComponent(debouncedQuery)}`
        : `/api/search/${searchType}?q=${encodeURIComponent(debouncedQuery)}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { results: [] };
        }
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000
  });

  const handleResultClick = useCallback((result: any) => {
    onResultSelect?.(result);
    setSearchQuery('');
  }, [onResultSelect]);

  return (
    <div className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Search temporarily unavailable. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {searchResults?.results && searchResults.results.length > 0 && (
        <div className="mt-2 border rounded-md bg-white shadow-sm max-h-64 overflow-y-auto">
          {searchResults.results.map((result: any, index: number) => (
            <div
              key={result.id || index}
              onClick={() => handleResultClick(result)}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
            >
              <div className="font-medium text-sm">{result.name}</div>
              {result.location && (
                <div className="text-xs text-gray-500">{result.location}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {searchQuery && searchResults && searchResults.results.length === 0 && !isLoading && (
        <div className="mt-2 p-3 text-sm text-gray-500 border rounded-md bg-gray-50">
          No results found for "{searchQuery}"
        </div>
      )}
    </div>
  );
}

export default SearchReliabilityFix;