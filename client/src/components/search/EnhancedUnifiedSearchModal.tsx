import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Search, 
  Clock, 
  TrendingUp, 
  MapPin, 
  User, 
  FileText, 
  UtensilsCrossed,
  ArrowRight,
  Star,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { useLocation } from 'wouter';
import './EnhancedUnifiedSearchModal.css';

// Enhanced interfaces with metadata
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

interface SearchSuggestion {
  query: string;
  category?: string;
  count?: number;
}

interface EnhancedUnifiedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedUnifiedSearchModal({ open, onOpenChange }: EnhancedUnifiedSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    restaurants: [],
    lists: [],
    posts: [],
    users: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('restaurants');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const debouncedQuery = useDebounce(searchQuery, 150); // Faster debounce for responsiveness

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'Escape':
        onOpenChange(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const maxIndex = getAllResultsFlat().length - 1;
          return prev < maxIndex ? prev + 1 : 0;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const maxIndex = getAllResultsFlat().length - 1;
          return prev > 0 ? prev - 1 : maxIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        const flatResults = getAllResultsFlat();
        if (selectedIndex >= 0 && flatResults[selectedIndex]) {
          handleResultClick(flatResults[selectedIndex]);
        }
        break;
    }
  }, [open, selectedIndex, onOpenChange]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus management
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Load initial data when modal opens
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Enhanced search with analytics tracking
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else if (debouncedQuery.length === 0) {
      setResults({ restaurants: [], lists: [], posts: [], users: [] });
      setSelectedIndex(-1);
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  // Real-time search suggestions
  useEffect(() => {
    if (searchQuery.length >= 1 && searchQuery.length < 2) {
      loadSearchSuggestions(searchQuery);
    }
  }, [searchQuery]);

  const loadInitialData = async () => {
    try {
      // Load trending searches and recent searches in parallel
      const [trendingRes, recentRes] = await Promise.all([
        fetch('/api/search-analytics/trending?limit=8'),
        fetch('/api/search-analytics/recent?limit=10')
      ]);

      if (trendingRes.ok) {
        const trendingData = await trendingRes.json();
        setTrending(trendingData.map((item: any) => ({
          name: item.query,
          type: 'trending',
          searchCount: item.search_count,
          trending: true
        })));
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentSearches(recentData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Fallback to static data for better UX
      setTrending([
        { name: 'Best pizza NYC', type: 'trending', trending: true },
        { name: 'Date night restaurants', type: 'trending', trending: true },
        { name: 'Brunch spots', type: 'trending', trending: true },
        { name: 'Ramen adventures', type: 'trending', trending: true }
      ]);
    }
  };

  const loadSearchSuggestions = async (query: string) => {
    try {
      const response = await fetch(`/api/search-analytics/suggestions?q=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const suggestionsData = await response.json();
        setSuggestions(suggestionsData.map((s: string) => ({ query: s })));
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const performSearch = async (query: string, page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(query)}&page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        
        if (page === 1) {
          setResults(data);
        } else {
          // Append results for infinite scroll
          setResults(prev => ({
            restaurants: [...prev.restaurants, ...data.restaurants],
            lists: [...prev.lists, ...data.lists],
            posts: [...prev.posts, ...data.posts],
            users: [...prev.users, ...data.users]
          }));
        }

        setHasMore(data.hasMore || false);
        setCurrentPage(page);

        // Track search analytics
        await trackSearchAnalytics(query, data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackSearchAnalytics = async (query: string, data: SearchResults) => {
    try {
      const totalResults = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
      await fetch('/api/search-analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          category: activeTab,
          resultCount: totalResults,
          clicked: false
        })
      });
    } catch (error) {
      console.error('Error tracking search analytics:', error);
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    // Track click analytics
    try {
      await fetch('/api/search-analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          category: activeTab,
          clicked: true,
          clickedResultId: result.id,
          clickedResultType: result.type
        })
      });
    } catch (error) {
      console.error('Error tracking click analytics:', error);
    }

    // Navigate based on result type
    switch (result.type) {
      case 'restaurant':
        setLocation(`/restaurant/${result.id}`);
        break;
      case 'list':
        setLocation(`/lists/${result.id}`);
        break;
      case 'post':
        setLocation(`/post/${result.id}`);
        break;
      case 'user':
        setLocation(`/profile/${result.id}`);
        break;
    }
    onOpenChange(false);
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchQuery(term);
  };

  const handleTrendingClick = (item: TrendingItem) => {
    setSearchQuery(item.name);
  };

  const getAllResultsFlat = () => {
    return Object.values(results).flat();
  };

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
      case 'post': return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'user': return <User className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < Math.floor(rating) 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderResultMetadata = (result: SearchResult) => {
    if (!result.metadata) return null;

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        {result.rating && renderStarRating(result.rating)}
        {result.metadata.memberCount && (
          <span>{result.metadata.memberCount} members</span>
        )}
        {result.metadata.postCount && (
          <span>{result.metadata.postCount} posts</span>
        )}
        {result.metadata.verified && (
          <span className="flex items-center gap-1 text-blue-500">
            <Sparkles className="h-3 w-3" />
            Verified
          </span>
        )}
        {result.metadata.priceRange && (
          <span>{result.metadata.priceRange}</span>
        )}
      </div>
    );
  };

  const loadMore = () => {
    if (hasMore && !isLoading && searchQuery.length >= 2) {
      performSearch(searchQuery, currentPage + 1);
    }
  };

  const hasResults = Object.values(results).some(arr => arr.length > 0);
  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="enhanced-search-modal">
        <div className="search-header-enhanced">
          <div className="search-input-container-enhanced">
            <Search className="search-icon-enhanced" size={20} />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search restaurants, lists, posts, people…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-enhanced"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {searchQuery && (
            <div className="search-meta">
              <span className="text-sm text-muted-foreground">
                {isLoading ? 'Searching...' : `${totalResults} results`}
              </span>
            </div>
          )}
        </div>

        {/* Search Suggestions (while typing) */}
        {searchQuery.length >= 1 && searchQuery.length < 2 && suggestions.length > 0 && (
          <div className="search-suggestions-enhanced">
            <div className="suggestion-header-enhanced">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Suggestions</span>
            </div>
            <div className="suggestion-list-enhanced">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="suggestion-item-enhanced"
                  onClick={() => setSearchQuery(suggestion.query)}
                >
                  <Search className="h-3 w-3" />
                  {suggestion.query}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Recent & Trending */}
        {!searchQuery && (
          <div className="search-empty-state">
            {recentSearches.length > 0 && (
              <div className="search-section">
                <div className="section-header-enhanced">
                  <Clock className="h-4 w-4" />
                  <span>Recent Searches</span>
                </div>
                <div className="recent-searches-enhanced">
                  {recentSearches.slice(0, 6).map((term, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="recent-search-item"
                      onClick={() => handleRecentSearchClick(term)}
                    >
                      <Clock className="h-3 w-3" />
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="search-section">
              <div className="section-header-enhanced">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span>Trending Now</span>
              </div>
              <div className="trending-grid">
                {trending.map((item, index) => (
                  <div
                    key={index}
                    className="trending-item-enhanced"
                    onClick={() => handleTrendingClick(item)}
                  >
                    <div className="trending-content-enhanced">
                      <div className="trending-name-enhanced">
                        {item.trending && <TrendingUp className="h-3 w-3 text-orange-500" />}
                        {item.name}
                      </div>
                      {item.searchCount && (
                        <div className="trending-meta">
                          {item.searchCount} searches
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <div className="search-results-enhanced" ref={resultsRef}>
            {isLoading && currentPage === 1 ? (
              <div className="loading-state-enhanced">
                <div className="loading-spinner-enhanced" />
                <span>Searching across all content...</span>
              </div>
            ) : hasResults ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="search-tabs-enhanced">
                <TabsList className="tabs-list-enhanced">
                  <TabsTrigger value="restaurants" className="tab-trigger-enhanced">
                    {getTabIcon('restaurants')}
                    Restaurants ({results.restaurants.length})
                  </TabsTrigger>
                  <TabsTrigger value="lists" className="tab-trigger-enhanced">
                    {getTabIcon('lists')}
                    Lists ({results.lists.length})
                  </TabsTrigger>
                  <TabsTrigger value="posts" className="tab-trigger-enhanced">
                    {getTabIcon('posts')}
                    Posts ({results.posts.length})
                  </TabsTrigger>
                  <TabsTrigger value="users" className="tab-trigger-enhanced">
                    {getTabIcon('users')}
                    People ({results.users.length})
                  </TabsTrigger>
                </TabsList>

                {Object.entries(results).map(([type, items]) => (
                  <TabsContent key={type} value={type} className="tab-content-enhanced">
                    <div className="results-list-enhanced">
                      {items.map((result, index) => (
                        <div
                          key={result.id}
                          className={`result-item-enhanced ${
                            selectedIndex === getAllResultsFlat().indexOf(result) ? 'selected' : ''
                          }`}
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="result-icon-enhanced">
                            {getResultIcon(result.type)}
                          </div>
                          <div className="result-content-enhanced">
                            <div className="result-main">
                              <span className="result-name-enhanced">{result.name}</span>
                              <span className="result-subtitle-enhanced">{result.subtitle}</span>
                            </div>
                            {renderResultMetadata(result)}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground result-arrow" />
                        </div>
                      ))}
                      
                      {/* Infinite Scroll Trigger */}
                      {hasMore && (
                        <div className="load-more-container">
                          <Button
                            variant="ghost"
                            className="load-more-btn"
                            onClick={loadMore}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Loading...' : 'Load More Results'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="no-results-enhanced">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3>No results found</h3>
                <p>We couldn't find anything matching "{searchQuery}"</p>
                <div className="no-results-suggestions">
                  <span>Try searching for:</span>
                  <div className="suggestion-tags">
                    {['pizza', 'sushi', 'date night', 'brunch'].map(tag => (
                      <Button
                        key={tag}
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}