import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useSearch } from '@/hooks/useSearch';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchResultsList } from '@/components/search/SearchResultsList';
import { SearchResult } from '@/services/searchService';
import { Clock, TrendingUp } from 'lucide-react';
import './UnifiedSearchModal.css';

interface UnifiedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnifiedSearchModal({ open, onOpenChange }: UnifiedSearchModalProps) {
  const [activeTab, setActiveTab] = useState('restaurants');
  const [, setLocation] = useLocation();
  
  const {
    searchQuery,
    setSearchQuery,
    results,
    isLoading,
    error,
    inputRef,
    recordSearch
  } = useSearch({
    searchType: 'unified',
    enabled: open,
    autoFocus: true,
    includeLocation: true,
    includeTrending: true,
    includeRecentSearches: true
  });

  // Fetch personalized recent searches
  const { data: personalizedSearches } = useQuery({
    queryKey: ['/api/search/recent-searches'],
    queryFn: async () => {
      const response = await fetch('/api/search/recent-searches');
      if (!response.ok) {
        throw new Error('Failed to fetch recent searches');
      }
      return response.json();
    },
    enabled: open,
    staleTime: 300000, // 5 minutes
  });

  // Fetch trending content when no search query
  const { data: trending } = useQuery({
    queryKey: ['/api/search/trending'],
    queryFn: async () => {
      const response = await fetch('/api/search/trending');
      if (!response.ok) {
        throw new Error('Failed to fetch trending content');
      }
      return response.json();
    },
    enabled: open && !searchQuery,
    staleTime: 300000, // 5 minutes
  });

  const handleResultClick = (result: SearchResult) => {
    try {
      // Validate result before navigation
      if (!result || !result.id || !result.type) {
        console.error('Invalid search result:', result);
        return;
      }

      // Navigate based on result type with enhanced routing
      switch (result.type) {
        case 'restaurant':
          // Handle both database and Google Places results
          if (result.id.startsWith('google_')) {
            const googlePlaceId = result.id.replace('google_', '');
            if (googlePlaceId) {
              setLocation(`/restaurants?googlePlaceId=${encodeURIComponent(googlePlaceId)}`);
            }
          } else {
            setLocation(`/restaurants/${encodeURIComponent(result.id)}`);
          }
          break;
        case 'list':
          setLocation(`/list-details/${encodeURIComponent(result.id)}`);
          break;
        case 'post':
          setLocation(`/post-details/${encodeURIComponent(result.id)}`);
          break;
        case 'user':
          setLocation(`/profile/${encodeURIComponent(result.id)}`);
          break;
        default:
          console.warn('Unknown result type:', result.type);
          break;
      }

      // Record the search and close modal
      recordSearch(result.name);
      onOpenChange(false);
    } catch (error) {
      console.error('Error handling result click:', error);
    }
  };

  const handleFollowToggle = (userId: string, isFollowing: boolean) => {
    // The FollowButton component handles the actual follow/unfollow logic
    // This is just a callback to update any local state if needed
    console.log(`User ${userId} follow status changed to: ${isFollowing}`);
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    setActiveTab('restaurants');
  };

  // Process results for current tab
  const getResultsForTab = (tab: string): SearchResult[] => {
    if (!results || typeof results !== 'object') return [];
    
    switch (tab) {
      case 'restaurants':
        return results.restaurants || [];
      case 'lists':
        return results.lists || [];
      case 'posts':
        return results.posts || [];
      case 'users':
        return results.users || [];
      default:
        return [];
    }
  };

  // Get trending results for current tab
  const getTrendingForTab = (tab: string): SearchResult[] => {
    if (!trending || typeof trending !== 'object') return [];
    
    switch (tab) {
      case 'restaurants':
        return trending.trending || [];
      case 'lists':
        return trending.lists || [];
      case 'posts':
        return trending.posts || [];
      case 'users':
        return trending.users || [];
      default:
        return [];
    }
  };

  const currentResults = getResultsForTab(activeTab);
  const currentTrending = getTrendingForTab(activeTab);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pb-4 border-b">
            <h2 className="text-xl font-semibold mb-4">Search Circles</h2>
            <SearchInput
              inputRef={inputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for restaurants, lists, posts, or people..."
              isLoading={isLoading}
              showLocationButton={true}
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
              <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
              <TabsTrigger value="lists">Lists</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="users">People</TabsTrigger>
            </TabsList>

            {/* Search Results */}
            <div className="flex-1 overflow-hidden">
              {searchQuery ? (
                <TabsContent value={activeTab} className="h-full overflow-y-auto p-6 pt-4">
                  <SearchResultsList
                    results={currentResults}
                    isLoading={isLoading}
                    error={error}
                    emptyMessage={`No ${activeTab} found matching "${searchQuery}"`}
                    onResultClick={handleResultClick}
                    onFollowToggle={activeTab === 'users' ? handleFollowToggle : undefined}
                    showFollowButton={activeTab === 'users'}
                  />
                </TabsContent>
              ) : (
                <TabsContent value={activeTab} className="h-full overflow-y-auto p-6 pt-4">
                  <div className="space-y-6">
                    {/* Recent Searches */}
                    {personalizedSearches?.recent?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium">Recent Searches</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {personalizedSearches.recent.map((search: string, index: number) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary/20"
                              onClick={() => handleRecentSearchClick(search)}
                            >
                              {search}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trending Content */}
                    {currentTrending.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium">Trending {activeTab}</h3>
                        </div>
                        <SearchResultsList
                          results={currentTrending}
                          isLoading={false}
                          error={null}
                          emptyMessage={`No trending ${activeTab} available`}
                          onResultClick={handleResultClick}
                          onFollowToggle={activeTab === 'users' ? handleFollowToggle : undefined}
                          showFollowButton={activeTab === 'users'}
                        />
                      </div>
                    )}

                    {/* Suggestions */}
                    {personalizedSearches?.suggestions?.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3">Suggested for You</h3>
                        <div className="flex flex-wrap gap-2">
                          {personalizedSearches.suggestions.map((suggestion: string, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary/20"
                              onClick={() => handleRecentSearchClick(suggestion)}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}