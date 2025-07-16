
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Hash } from 'lucide-react';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestedTags?: string[];
  maxTags?: number;
  placeholder?: string;
}

export function TagSelector({
  selectedTags,
  onTagsChange,
  suggestedTags = [],
  maxTags = 10,
  placeholder = "Add tags..."
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  // Default suggested tags if none provided
  const defaultSuggestions = [
    'spicy', 'hiddenGem', 'noodles', 'pizza', 'brunch', 'dateNight',
    'familyFriendly', 'vegan', 'glutenFree', 'affordable', 'upscale',
    'quickBite', 'musttry', 'newOpening', 'localFavorite', 'authentic'
  ];

  const allSuggestions = suggestedTags.length > 0 ? suggestedTags : defaultSuggestions;

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allSuggestions.filter(tag =>
        tag.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.includes(tag)
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(
        allSuggestions.filter(tag => !selectedTags.includes(tag)).slice(0, 8)
      );
    }
  }, [inputValue, selectedTags, allSuggestions]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !selectedTags.includes(trimmedTag) && selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, trimmedTag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary border-primary/20"
            >
              <Hash className="w-3 h-3" />
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="pr-10"
          disabled={selectedTags.length >= maxTags}
        />
        {inputValue && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addTag(inputValue)}
            className="absolute right-1 top-1 h-8 w-8 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Suggested Tags */}
      {filteredSuggestions.length > 0 && selectedTags.length < maxTags && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Suggested tags:</p>
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map(tag => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-1"
              >
                <Hash className="w-3 h-3" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tag count indicator */}
      <p className="text-xs text-gray-500">
        {selectedTags.length}/{maxTags} tags
      </p>
    </div>
  );
}
