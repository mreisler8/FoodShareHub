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
  allowCustomTags?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

export function SmartTagInput({ 
  selectedTags, 
  onTagsChange, 
  listTitle = "",
  contextRestaurants = [],
  maxTags = 10,
  allowCustomTags = true,
  placeholder = "Add custom tag...",
  suggestions = []
}: SmartTagInputProps) {
  const [inputValue, setInputValue] = useState("");

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

  // Generate smart tag suggestions
  const getSmartSuggestions = () => {
    const allSuggestions = new Set<string>();

    // Add provided suggestions first
    if (suggestions && suggestions.length > 0) {
      suggestions.forEach(tag => allSuggestions.add(tag));
    } else {
      // Context-based suggestions
      contextRestaurants.forEach(restaurant => {
        if (restaurant.cuisine) {
          allSuggestions.add(restaurant.cuisine);
        }
      });

      // Default high-value tags
      const defaultTags = [
        'Must Try',
        'Hidden Gem',
        'Great Value',
        'casual', 'fine-dining', 'date-night', 'family-friendly', 
        'brunch', 'lunch', 'dinner', 'cheap-eats'
      ];

      defaultTags.forEach(tag => allSuggestions.add(tag));

      // Add popular tags from backend
      if (Array.isArray(popularTags)) {
        popularTags.slice(0, 5).forEach((tag: any) => {
          const tagName = typeof tag === 'string' ? tag : (tag?.name || tag?.value || String(tag));
          if (tagName) allSuggestions.add(tagName);
        });
      }
    }

    // Filter out selected tags and return array
    return Array.from(allSuggestions)
      .filter(tag => !selectedTags.includes(tag))
      .slice(0, 8);
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
    <div className="space-y-3">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
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

      {/* Quick Suggestions */}
      {smartSuggestions.length > 0 && selectedTags.length < maxTags && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">
            Quick suggestions:
          </div>
          <div className="flex flex-wrap gap-2">
            {smartSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                onClick={() => handleAddTag(suggestion)}
              >
                + {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Tag Input */}
      {allowCustomTags && selectedTags.length < maxTags && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">
            Add custom tag:
          </div>
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              className="flex-1 text-sm"
              maxLength={20}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInputSubmit}
              disabled={!inputValue.trim()}
              className="px-3"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-400">
            Press Enter or click + to add. Max {maxTags} tags.
          </div>
        </div>
      )}

      {/* Tag Count Indicator */}
      <div className="text-xs text-gray-500">
        {selectedTags.length} / {maxTags} tags selected
      </div>
    </div>
  );
}