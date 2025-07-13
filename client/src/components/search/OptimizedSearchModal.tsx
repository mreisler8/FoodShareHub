import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Clock, 
  TrendingUp, 
  MapPin, 
  User, 
  FileText, 
  UtensilsCrossed,
  Star,
  X,
  Loader2
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { debounce } from '@/lib/utils';
import './OptimizedSearchModal.css';

// Optimized interfaces for consistent search experience
interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  type: 'restaurant' | 'list' | 'post' | 'user';
  avatar?: string;
  location?: string;
  rating?: number;
  metadata?: {
    memberCount?: number;
    listCount?: number;
    postCount?: number;
    likes?: number;
    verified?: boolean;
    category?: string;
    priceRange?: string;
  };
}

interface SearchResults {
  restaurants: SearchResult[];
  lists: SearchResult[];
  posts: SearchResult[];
  users: SearchResult[];
}

interface TrendingItem {
  name: string;
  type: string;
  location?: string;
  creator?: string;
  searchCount?: number;
  trending?: boolean;
}

interface OptimizedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OptimizedSearchModal({ open, onOpenChange }: OptimizedSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('restaurants');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [, navigate] = useLocation();

  const inputRef = useRef<HTMLInputElement>(null);
  const searchAbortController = useRef<AbortController | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('circles-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    if (query.trim() && query.length >= 2) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('circles-recent-searches', JSON.stringify(updated));
    }
  }, [recentSearches]);

  // Optimized debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();

  useEffect(() => {
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current.cancel();
    }

    debouncedSearchRef.current = debounce((query: string) => {
      setDebouncedQuery(query);
    }, 300);

    debouncedSearchRef.current(searchQuery);

    return () => {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel();
      }
    };
  }, [searchQuery]);

  // Focus management
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Search results with optimized caching
  const { data: results, isLoading, error } = useQuery<SearchResults>({
    queryKey: ['/api/search/unified', debouncedQuery],
    queryFn: async () => {
      // Cancel previous request
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }

      searchAbortController.current = new AbortController();

      const params = new URLSearchParams({ q: debouncedQuery });
      const response = await fetch(`/api/search/unified?${params}`, {
        signal: searchAbortController.current.signal,
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
    },
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: 2,
  });

  // Trending content
  const { data: trending } = useQuery({
    queryKey: ['/api/search/trending'],
    queryFn: async () => {
      const response = await fetch('/api/search/trending');
      if (!response.ok) throw new Error('Failed to fetch trending');
      return response.json();
    },
    enabled: open && !debouncedQuery,
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  });

  // Navigation handlers
  const handleResultClick = useCallback((result: SearchResult) => {
    saveRecentSearch(searchQuery);

    // Navigate based on result type
    switch (result.type) {
      case 'restaurant':
        navigate(`/restaurant/${result.id}`);
        break;
      case 'list':
        navigate(`/lists/${result.id}`);
        break;
      case 'post':
        navigate(`/post/${result.id}`);
        break;
      case 'user':
        navigate(`/profile/${result.id}`);
        break;
    }
    onOpenChange(false);
  }, [navigate, onOpenChange, saveRecentSearch, searchQuery]);

  const handleRecentSearchClick = useCallback((term: string) => {
    setSearchQuery(term);
    setActiveTab('restaurants'); // Reset to default tab
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('circles-recent-searches');
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onOpenChange]);

  // UI helpers
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'restaurants': return <UtensilsCrossed className="h-4 w-4" />;
      case 'lists': return <FileText className="h-4 w-4" />;
      case 'posts': return <MapPin className="h-4 w-4" />;
      case 'users': return <User className="h-4 w-4" />;
      default: return null;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return <UtensilsCrossed className="h-4 w-4 text-primary" />;
      case 'list': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'post': return <MapPin className="h-4 w-4 text-green-500" />;
      case 'user': return <User className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  const getResultCount = (type: string) => {
    if (!results) return 0;
    return results[type as keyof SearchResults]?.length || 0;
  };

  const hasResults = results && Object.values(results).some(arr => arr.length > 0);
  const totalResults = results ? Object.values(results).reduce((acc, arr) => acc + arr.length, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="optimized-search-modal" aria-describedby="search-description">
        <div className="sr-only">
          <h2 id="search-title">Search</h2>
          <p id="search-description">Search for restaurants, lists, posts, and people</p>
        </div>
        {/* Search Header */}
        <div className="search-header-optimized">
          <div className="search-input-container-optimized">
            <Search className="search-icon-optimized" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search restaurants, lists, posts, people…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-optimized"
              autoComplete="off"
              spellCheck="false"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Search Stats */}
          {hasResults && (
            <div className="search-stats">
              <span className="text-sm text-muted-foreground">
                {totalResults} result{totalResults !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="search-content-optimized">
          {!searchQuery && (
            <div className="search-suggestions">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="suggestion-section">
                  <div className="suggestion-header">
                    <Clock className="h-4 w-4" />
                    <span>Recent</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRecentSearches}
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="suggestion-list">
                    {recentSearches.map((term, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="suggestion-item"
                        onClick={() => handleRecentSearchClick(term)}
                      >
                        {term}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              {trending && (
                <div className="suggestion-section">
                  <div className="suggestion-header">
                    <TrendingUp className="h-4 w-4" />
                    <span>Trending</span>
                  </div>
                  <div className="suggestion-list">
                    {trending.slice(0, 8).map((item: TrendingItem, index: number) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="suggestion-item"
                        onClick={() => handleRecentSearchClick(item.name)}
                      >
                        {item.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {debouncedQuery && (
            <div className="search-results">
              {isLoading && (
                <div className="loading-state">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Searching...</span>
                </div>
              )}

              {error && (
                <div className="error-state">
                  <span>Search failed. Please try again.</span>
                </div>
              )}

              {results && !isLoading && (
                <>
                  {hasResults ? (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="tabs-list-optimized">
                        <TabsTrigger value="restaurants" className="tab-trigger-optimized">
                          {getTabIcon('restaurants')}
                          <span>Restaurants ({getResultCount('restaurants')})</span>
                        </TabsTrigger>
                        <TabsTrigger value="lists" className="tab-trigger-optimized">
                          {getTabIcon('lists')}
                          <span>Lists ({getResultCount('lists')})</span>
                        </TabsTrigger>
                        <TabsTrigger value="posts" className="tab-trigger-optimized">
                          {getTabIcon('posts')}
                          <span>Posts ({getResultCount('posts')})</span>
                        </TabsTrigger>
                        <TabsTrigger value="users" className="tab-trigger-optimized">
                          {getTabIcon('users')}
                          <span>People ({getResultCount('users')})</span>
                        </TabsTrigger>
                      </TabsList>

                      {(['restaurants', 'lists', 'posts', 'users'] as const).map((type) => (
                        <TabsContent key={type} value={type} className="tab-content-optimized">
                          <div className="results-list">
                            {results[type].map((result) => (
                              <Button
                                key={result.id}
                                variant="ghost"
                                className="result-item-optimized"
                                onClick={() => handleResultClick(result)}
                              >
                                {getResultIcon(result.type)}
                                <div className="result-content-optimized">
                                  <div className="result-name-optimized">{result.name}</div>
                                  <div className="result-subtitle-optimized">{result.subtitle}</div>
                                  {result.rating && (
                                    <div className="result-rating">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span>{result.rating}</span>
                                    </div>
                                  )}
                                </div>
                              </Button>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <div className="no-results-optimized">
                      <Search className="h-12 w-12 text-muted-foreground" />
                      <span>No results found for "{debouncedQuery}"</span>
                      <p className="text-sm text-muted-foreground">
                        Try different keywords or check your spelling
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}