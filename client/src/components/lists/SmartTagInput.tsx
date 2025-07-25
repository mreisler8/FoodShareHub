import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag } from "lucide-react";

interface SmartTagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  listTitle?: string;
  contextRestaurants?: Array<{ cuisine?: string; location?: string }>;
  maxTags?: number;
}

export function SmartTagInput({ 
  selectedTags, 
  onTagsChange, 
  listTitle = "",
  contextRestaurants = [],
  maxTags = 10
}: SmartTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Fetch popular tags from backend
  const { data: popularTags = [] } = useQuery({
    queryKey: ["/api/tags/popular"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/tags/popular");
        if (!response.ok) return [];
        const data = await response.json();
        return data.tags || [];
      } catch {
        return [];
      }
    },
  });

  // Generate smart tag suggestions based on context
  const getSmartSuggestions = () => {
    const suggestions = new Set<string>();

    // Cuisine-based suggestions from context restaurants
    contextRestaurants.forEach(restaurant => {
      if (restaurant.cuisine) {
        suggestions.add(restaurant.cuisine);
        if (restaurant.cuisine.toLowerCase().includes('italian')) {
          suggestions.add('Pasta');
          suggestions.add('Wine');
        }
        if (restaurant.cuisine.toLowerCase().includes('asian')) {
          suggestions.add('Spicy');
          suggestions.add('Noodles');
        }
      }
    });

    // Location-based suggestions
    contextRestaurants.forEach(restaurant => {
      if (restaurant.location) {
        const location = restaurant.location.toLowerCase();
        if (location.includes('downtown')) suggestions.add('Downtown');
        if (location.includes('waterfront')) suggestions.add('Waterfront');
        if (location.includes('beach')) suggestions.add('Beach');
      }
    });

    // Title-based suggestions
    const titleLower = listTitle.toLowerCase();
    if (titleLower.includes('date')) suggestions.add('Date Night');
    if (titleLower.includes('family')) suggestions.add('Family Friendly');
    if (titleLower.includes('business')) suggestions.add('Business Lunch');
    if (titleLower.includes('brunch')) suggestions.add('Brunch');
    if (titleLower.includes('late')) suggestions.add('Late Night');
    if (titleLower.includes('cheap') || titleLower.includes('budget')) suggestions.add('Budget Friendly');
    if (titleLower.includes('fancy') || titleLower.includes('upscale')) suggestions.add('Upscale');

    // Default occasion and mood tags
    const defaultTags = [
      'Must Try',
      'Hidden Gem',
      'Local Favorite',
      'Great Value',
      'Romantic',
      'Casual',
      'Quick Bite',
      'Vegetarian Friendly',
      'Good for Groups',
      'Outdoor Seating',
    ];

    defaultTags.forEach(tag => suggestions.add(tag));

    // Add popular tags from backend - ensure we handle both strings and objects
    if (Array.isArray(popularTags)) {
      popularTags.forEach((tag: any) => {
        const tagName = typeof tag === 'string' ? tag : (tag?.name || tag?.value || String(tag));
        if (tagName) suggestions.add(tagName);
      });
    }

    // Filter out already selected tags and convert to array
    // Limit to 6 suggestions for mobile-friendly display
    return Array.from(suggestions).filter(tag => 
      !selectedTags.includes(tag)
    ).slice(0, 6);
  };

  const smartSuggestions = getSmartSuggestions();

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag) && tag.trim() && selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag.trim()]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
      setInputValue("");
    }
  };

  const handleInputSubmit = () => {
    if (inputValue.trim()) {
      handleAddTag(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1"
            >
              <Tag className="h-3 w-3" />
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent"
                onClick={() => handleRemoveTag(tag)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Custom Tag Input */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={selectedTags.length >= maxTags ? `Maximum ${maxTags} tags reached` : "Add custom tag..."}
          className="flex-1"
          disabled={selectedTags.length >= maxTags}
        />
        <Button
          type="button"
          onClick={handleInputSubmit}
          disabled={!inputValue.trim() || selectedTags.length >= maxTags}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {selectedTags.length >= maxTags && (
        <p className="text-xs text-amber-600 mt-1">
          Maximum {maxTags} tags selected
        </p>
      )}

      {/* Smart Suggestions */}
      {showSuggestions && smartSuggestions.length > 0 && selectedTags.length < maxTags && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Suggested tags:
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(false)}
              className="text-xs"
            >
              Hide suggestions
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {smartSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleAddTag(suggestion);
                  setShowSuggestions(smartSuggestions.length > 1);
                }}
                className="text-xs h-7"
                disabled={selectedTags.length >= maxTags}
              >
                + {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!showSuggestions && smartSuggestions.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSuggestions(true)}
          className="text-sm"
        >
          Show tag suggestions ({smartSuggestions.length})
        </Button>
      )}
    </div>
  );
}