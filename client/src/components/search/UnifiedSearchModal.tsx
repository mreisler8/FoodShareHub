import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Clock, TrendingUp, MapPin, Star, User, FileText, Users } from "lucide-react";
import { useLocation } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";
import "./UnifiedSearchModal.css";

interface SearchResult {
  id: string | number;
  name: string;
  type: 'restaurant' | 'list' | 'post' | 'user';
  [key: string]: any;
}

interface UnifiedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnifiedSearchModal({ open, onOpenChange }: UnifiedSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("restaurants");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Search results query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search/unified", debouncedSearchTerm],
    enabled: debouncedSearchTerm.length >= 2,
  });

  // Trending content query
  const { data: trendingData } = useQuery({
    queryKey: ["/api/search/trending"],
    enabled: open && !debouncedSearchTerm,
  });

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(searchTerm);
    onOpenChange(false);
    
    switch (result.type) {
      case 'restaurant':
        // Navigate to restaurant page or create post with restaurant
        navigate(`/create-post?restaurantId=${result.id}`);
        break;
      case 'list':
        navigate(`/lists/${result.id}`);
        break;
      case 'post':
        navigate(`/posts/${result.id}`);
        break;
      case 'user':
        navigate(`/profile/${result.id}`);
        break;
    }
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchTerm(term);
  };

  const getCurrentResults = () => {
    if (!searchResults) return [];
    
    switch (activeTab) {
      case 'restaurants':
        return searchResults.restaurants || [];
      case 'lists':
        return searchResults.lists || [];
      case 'posts':
        return searchResults.posts || [];
      case 'users':
        return searchResults.users || [];
      default:
        return [];
    }
  };

  const getResultCounts = () => {
    if (!searchResults) return {};
    
    return {
      restaurants: searchResults.restaurants?.length || 0,
      lists: searchResults.lists?.length || 0,
      posts: searchResults.posts?.length || 0,
      users: searchResults.users?.length || 0,
    };
  };

  const renderResultItem = (result: SearchResult, index: number) => {
    const isSelected = selectedIndex === index;
    
    return (
      <div
        key={`${result.type}-${result.id}`}
        className={`search-result-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleResultClick(result)}
      >
        <div className="result-icon">
          {result.type === 'restaurant' && <MapPin className="h-4 w-4" />}
          {result.type === 'list' && <FileText className="h-4 w-4" />}
          {result.type === 'post' && <Star className="h-4 w-4" />}
          {result.type === 'user' && <User className="h-4 w-4" />}
        </div>
        
        <div className="result-content">
          <div className="result-title">{result.name}</div>
          <div className="result-subtitle">
            {result.type === 'restaurant' && (
              <span>{result.location} • {result.category}</span>
            )}
            {result.type === 'list' && (
              <span>{result.description || 'Restaurant list'}</span>
            )}
            {result.type === 'post' && (
              <span>{result.content?.substring(0, 60)}...</span>
            )}
            {result.type === 'user' && (
              <span>{result.bio || result.username}</span>
            )}
          </div>
        </div>
        
        {result.type === 'restaurant' && result.priceRange && (
          <Badge variant="secondary">{result.priceRange}</Badge>
        )}
        {result.type === 'post' && result.rating && (
          <div className="flex items-center">
            <Star className="h-3 w-3 fill-current text-yellow-400" />
            <span className="ml-1 text-sm">{result.rating}</span>
          </div>
        )}
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const results = getCurrentResults();
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleResultClick(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  // Reset selected index when tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeTab]);

  const counts = getResultCounts();
  const hasResults = Object.values(counts).some(count => count > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="unified-search-modal">
        <DialogHeader className="search-header">
          <div className="search-input-container">
            <Search className="search-icon" />
            <Input
              ref={inputRef}
              placeholder="Search restaurants, lists, posts, people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
            />
          </div>
        </DialogHeader>

        <div className="search-content">
          {!debouncedSearchTerm ? (
            <div className="search-empty-state">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="search-section">
                  <h3 className="section-title">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h3>
                  <div className="recent-searches">
                    {recentSearches.map((term, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRecentSearchClick(term)}
                        className="recent-search-item"
                      >
                        {term}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              {trendingData?.trending && (
                <div className="search-section">
                  <h3 className="section-title">
                    <TrendingUp className="h-4 w-4" />
                    Trending
                  </h3>
                  <div className="trending-items">
                    {trendingData.trending.map((item: any) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="trending-item"
                        onClick={() => handleResultClick(item)}
                      >
                        <div className="trending-icon">
                          {item.type === 'restaurant' && <MapPin className="h-4 w-4" />}
                          {item.type === 'list' && <FileText className="h-4 w-4" />}
                        </div>
                        <div className="trending-content">
                          <div className="trending-name">{item.name}</div>
                          {item.location && (
                            <div className="trending-subtitle">{item.location}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="search-results">
              {isLoading ? (
                <div className="search-loading">Searching...</div>
              ) : hasResults ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="search-tabs">
                    <TabsTrigger value="restaurants">
                      Restaurants ({counts.restaurants})
                    </TabsTrigger>
                    <TabsTrigger value="lists">
                      Lists ({counts.lists})
                    </TabsTrigger>
                    <TabsTrigger value="posts">
                      Posts ({counts.posts})
                    </TabsTrigger>
                    <TabsTrigger value="users">
                      People ({counts.users})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="restaurants" className="search-tab-content">
                    {getCurrentResults().map((result, index) => renderResultItem(result, index))}
                  </TabsContent>
                  
                  <TabsContent value="lists" className="search-tab-content">
                    {getCurrentResults().map((result, index) => renderResultItem(result, index))}
                  </TabsContent>
                  
                  <TabsContent value="posts" className="search-tab-content">
                    {getCurrentResults().map((result, index) => renderResultItem(result, index))}
                  </TabsContent>
                  
                  <TabsContent value="users" className="search-tab-content">
                    {getCurrentResults().map((result, index) => renderResultItem(result, index))}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="search-no-results">
                  <div className="no-results-icon">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="no-results-text">
                    No results found for "{searchTerm}"
                  </div>
                  <div className="no-results-subtitle">
                    Try adjusting your search terms or browse trending content
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}