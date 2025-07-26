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
    const suggestions = new Set<string>();

    // Context-based suggestions
    contextRestaurants.forEach(restaurant => {
      if (restaurant.cuisine) {
        suggestions.add(restaurant.cuisine);
      }
    });

    // Default high-value tags
    const defaultTags = [
      'Must Try',
      'Hidden Gem',
      'Great Value'
    ];

    defaultTags.forEach(tag => suggestions.add(tag));

    // Add popular tags from backend
    if (Array.isArray(popularTags)) {
      popularTags.slice(0, 3).forEach((tag: any) => {
        const tagName = typeof tag === 'string' ? tag : (tag?.name || tag?.value || String(tag));
        if (tagName) suggestions.add(tagName);
      });
    }

    // Filter out selected tags and limit
    return Array.from(suggestions)
      .filter(tag => !selectedTags.includes(tag))
      .slice(0, 3);
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
                onClick={() => handleAddTag(suggestion)}
                className="text-xs h-7 px-3 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                disabled={selectedTags.length >= maxTags}
              >
                + {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Tag Input */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={selectedTags.length >= maxTags ? `Maximum ${maxTags} tags` : "Add custom tag..."}
          className="flex-1 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          disabled={selectedTags.length >= maxTags}
        />
        <Button
          type="button"
          onClick={handleInputSubmit}
          disabled={!inputValue.trim() || selectedTags.length >= maxTags}
          size="sm"
          className="px-3"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedTags.length >= maxTags && (
        <p className="text-xs text-amber-600">
          Maximum {maxTags} tags selected
        </p>
      )}
    </div>
  );
}