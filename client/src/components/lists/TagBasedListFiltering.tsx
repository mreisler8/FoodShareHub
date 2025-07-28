
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';

interface TagBasedListFilteringProps {
  lists: any[];
  onFilteredListsChange: (filteredLists: any[]) => void;
}

export function TagBasedListFiltering({ lists, onFilteredListsChange }: TagBasedListFilteringProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique tags and occasions from lists
  const { allTags, allOccasions } = useMemo(() => {
    const tags = new Set<string>();
    const occasions = new Set<string>();
    
    lists.forEach(list => {
      if (list.tags) {
        list.tags.forEach((tag: string) => {
          if (tag.includes('date-night') || tag.includes('birthday') || tag.includes('anniversary')) {
            occasions.add(tag);
          } else {
            tags.add(tag);
          }
        });
      }
    });
    
    return {
      allTags: Array.from(tags).sort(),
      allOccasions: Array.from(occasions).sort()
    };
  }, [lists]);

  // Filter lists based on selected criteria
  const filteredLists = useMemo(() => {
    let filtered = lists;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(list => 
        list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        list.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(list => 
        list.tags && selectedTags.some((tag: string) => list.tags.includes(tag))
      );
    }

    // Filter by selected occasions
    if (selectedOccasions.length > 0) {
      filtered = filtered.filter(list => 
        list.tags && selectedOccasions.some((occasion: string) => list.tags.includes(occasion))
      );
    }

    return filtered;
  }, [lists, searchQuery, selectedTags, selectedOccasions]);

  // Update parent component with filtered results
  React.useEffect(() => {
    onFilteredListsChange(filteredLists);
  }, [filteredLists, onFilteredListsChange]);

  const toggleTag = (tag: string, isOccasion: boolean = false) => {
    if (isOccasion) {
      setSelectedOccasions(prev => 
        prev.includes(tag) 
          ? prev.filter(t => t !== tag)
          : [...prev, tag]
      );
    } else {
      setSelectedTags(prev => 
        prev.includes(tag) 
          ? prev.filter(t => t !== tag)
          : [...prev, tag]
      );
    }
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedOccasions([]);
    setSearchQuery('');
  };

  const activeFiltersCount = selectedTags.length + selectedOccasions.length + (searchQuery ? 1 : 0);

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Lists
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search lists by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Occasion Filters - Critical for Seeker Sam */}
        {allOccasions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Occasions</h4>
            <div className="flex flex-wrap gap-2">
              {allOccasions.map(occasion => (
                <Button
                  key={occasion}
                  variant={selectedOccasions.includes(occasion) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTag(occasion, true)}
                  className="text-xs"
                >
                  {occasion.replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 12).map(tag => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTag(tag)}
                  className="text-xs"
                >
                  {tag.replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="text-sm text-gray-600 pt-2 border-t">
          Showing {filteredLists.length} of {lists.length} lists
        </div>
      </CardContent>
    </Card>
  );
}
