
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Clock, TrendingUp, MapPin, User, FileText, UtensilsCrossed } from 'lucide-react';
import './UnifiedSearchModal.css';

interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  type: 'restaurant' | 'list' | 'post' | 'user';
  avatar?: string;
  location?: string;
}

interface SearchResults {
  restaurants: SearchResult[];
  lists: SearchResult[];
  posts: SearchResult[];
  users: SearchResult[];
}

interface UnifiedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnifiedSearchModal({ open, onOpenChange }: UnifiedSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    restaurants: [],
    lists: [],
    posts: [],
    users: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('restaurants');
  const [recentSearches] = useState(['Pizza', 'Sushi', 'Best coffee', 'Date night', 'Brunch spots']);
  const [trending] = useState([
    { name: 'Veselka', type: 'Ukrainian', location: 'East Village' },
    { name: 'Best Pizza Places', type: 'list', creator: 'Alex Chen' },
    { name: 'Hidden Gems Toronto', type: 'list', creator: 'Sarah Kim' },
    { name: 'Late Night Eats', type: 'list', creator: 'Mike Rodriguez' },
    { name: 'Ramen Adventures', type: 'list', creator: 'Jenny Liu' }
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults({ restaurants: [], lists: [], posts: [], users: [] });
    }
  }, [debouncedQuery]);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Navigate based on result type
    switch (result.type) {
      case 'restaurant':
        window.location.href = `/restaurant/${result.id}`;
        break;
      case 'list':
        window.location.href = `/list/${result.id}`;
        break;
      case 'post':
        window.location.href = `/post/${result.id}`;
        break;
      case 'user':
        window.location.href = `/profile/${result.id}`;
        break;
    }
    onOpenChange(false);
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchQuery(term);
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

  const hasResults = Object.values(results).some(arr => arr.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="unified-search-modal max-w-2xl">
        <div className="search-header">
          <div className="search-input-container">
            <Search className="search-icon" size={20} />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search restaurants, lists, posts, people…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {!searchQuery && (
          <div className="search-suggestions">
            <div className="suggestion-section">
              <div className="suggestion-header">
                <Clock className="h-4 w-4" />
                <span>Recent Searches</span>
              </div>
              <div className="suggestion-list">
                {recentSearches.map((term, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="suggestion-item"
                    onClick={() => handleRecentSearchClick(term)}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>

            <div className="suggestion-section">
              <div className="suggestion-header">
                <TrendingUp className="h-4 w-4" />
                <span>Trending</span>
              </div>
              <div className="trending-list">
                {trending.map((item, index) => (
                  <div key={index} className="trending-item">
                    <div className="trending-content">
                      <span className="trending-name">{item.name}</span>
                      <span className="trending-subtitle">
                        {item.type === 'list' ? `by ${item.creator}` : item.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {searchQuery && (
          <div className="search-results">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Searching...</span>
              </div>
            ) : hasResults ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="search-tabs">
                <TabsList className="tabs-list">
                  <TabsTrigger value="restaurants" className="tab-trigger">
                    {getTabIcon('restaurants')}
                    Restaurants ({results.restaurants.length})
                  </TabsTrigger>
                  <TabsTrigger value="lists" className="tab-trigger">
                    {getTabIcon('lists')}
                    Lists ({results.lists.length})
                  </TabsTrigger>
                  <TabsTrigger value="posts" className="tab-trigger">
                    {getTabIcon('posts')}
                    Posts ({results.posts.length})
                  </TabsTrigger>
                  <TabsTrigger value="users" className="tab-trigger">
                    {getTabIcon('users')}
                    People ({results.users.length})
                  </TabsTrigger>
                </TabsList>

                {Object.entries(results).map(([type, items]) => (
                  <TabsContent key={type} value={type} className="tab-content">
                    <div className="results-list">
                      {items.map((result) => (
                        <Button
                          key={result.id}
                          variant="ghost"
                          className="result-item"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="result-icon">
                            {getResultIcon(result.type)}
                          </div>
                          <div className="result-content">
                            <span className="result-name">{result.name}</span>
                            <span className="result-subtitle">{result.subtitle}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="no-results">
                <Search className="h-8 w-8 text-muted-foreground" />
                <span>No results found for "{searchQuery}"</span>
                <p className="text-sm text-muted-foreground">
                  Try searching for restaurants, lists, posts, or people
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
