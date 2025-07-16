import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { SearchService, SearchResult, UnifiedSearchResults, SearchOptions } from '../services/searchService';
import { LocationService, LocationData } from '../services/locationService';

export interface UseSearchOptions extends SearchOptions {
  searchType?: 'unified' | 'restaurants' | 'users';
  enabled?: boolean;
  minQueryLength?: number;
  staleTime?: number;
  autoFocus?: boolean;
  includeTrending?: boolean;
  includeRecentSearches?: boolean;
}

export interface UseSearchReturn {
  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedQuery: string;
  
  // Results
  results: UnifiedSearchResults | SearchResult[];
  isLoading: boolean;
  error: Error | null;
  
  // Trending and recent searches
  trending: SearchResult[];
  recentSearches: string[];
  
  // Location
  userLocation: LocationData | null;
  locationPermission: 'granted' | 'denied' | 'prompt' | null;
  requestLocation: () => Promise<void>;
  
  // Refs and handlers
  inputRef: React.RefObject<HTMLInputElement>;
  handleResultClick: (result: SearchResult) => void;
  handleRecentSearchClick: (query: string) => void;
  
  // Search recording
  recordSearch: (query: string) => Promise<void>;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    searchType = 'unified',
    enabled = true,
    minQueryLength = 2,
    staleTime = 30000,
    autoFocus = false,
    includeTrending = true,
    includeRecentSearches = true,
    ...searchOptions
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const searchService = SearchService.getInstance();

  // Auto-focus input if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  // Request location on initialization
  useEffect(() => {
    if (enabled && searchOptions.includeLocation !== false) {
      requestLocation();
    }
  }, [enabled]);

  const requestLocation = async () => {
    try {
      setLocationPermission('prompt');
      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
      setLocationPermission('granted');
    } catch (error) {
      setLocationPermission('denied');
    }
  };

  // Fetch recent searches if enabled
  const { data: recentSearchData } = useQuery({
    queryKey: ['/api/search/recent-searches'],
    queryFn: () => searchService.getRecentSearches(),
    enabled: enabled && includeRecentSearches,
    staleTime: 300000, // 5 minutes
    onSuccess: (data) => {
      setRecentSearches(data.recent || []);
    }
  });

  // Fetch trending content if enabled
  const { data: trendingData } = useQuery({
    queryKey: ['/api/search/trending', { location: userLocation }],
    queryFn: () => searchService.getTrending({ location: userLocation }),
    enabled: enabled && includeTrending && !debouncedQuery,
    staleTime: 300000, // 5 minutes
  });

  // Main search query
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['/api/search', searchType, { q: debouncedQuery, location: userLocation }],
    queryFn: async () => {
      const options = { location: userLocation, ...searchOptions };
      
      switch (searchType) {
        case 'restaurants':
          return searchService.searchRestaurants(debouncedQuery, options);
        case 'users':
          return searchService.searchUsers(debouncedQuery, options);
        case 'unified':
        default:
          return searchService.searchUnified(debouncedQuery, options);
      }
    },
    enabled: enabled && debouncedQuery.length >= minQueryLength,
    staleTime,
    retry: 2,
    retryDelay: 1000,
  });

  // Handle result click (to be implemented by consuming components)
  const handleResultClick = (result: SearchResult) => {
    // This will be overridden by consuming components
    console.log('Result clicked:', result);
  };

  // Handle recent search click
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    recordSearch(query);
  };

  // Record search for analytics
  const recordSearch = async (query: string) => {
    try {
      await searchService.recordSearch(query);
    } catch (error) {
      // Silently fail - analytics is not critical
    }
  };

  return {
    // Search state
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    
    // Results
    results: searchResults || (searchType === 'unified' ? { restaurants: [], lists: [], posts: [], users: [] } : []),
    isLoading,
    error,
    
    // Trending and recent searches
    trending: trendingData?.trending || [],
    recentSearches,
    
    // Location
    userLocation,
    locationPermission,
    requestLocation,
    
    // Refs and handlers
    inputRef,
    handleResultClick,
    handleRecentSearchClick,
    
    // Search recording
    recordSearch,
  };
}