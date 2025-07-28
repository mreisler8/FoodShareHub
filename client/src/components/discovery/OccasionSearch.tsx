import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Sparkles, 
  Heart, 
  Users, 
  Clock, 
  Utensils, 
  Star, 
  ChefHat,
  Calendar,
  TrendingUp,
  MapPin,
  Wand2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';

interface OccasionSearchProps {
  onSearch: (query: string, tags: string[]) => void;
  className?: string;
}

interface PopularOccasion {
  id: string;
  label: string;
  icon: any;
  description: string;
  suggestedTags: string[];
  trending?: boolean;
}

const POPULAR_OCCASIONS: PopularOccasion[] = [
  {
    id: 'date-night',
    label: 'Date Night',
    icon: Heart,
    description: 'Romantic restaurants perfect for couples',
    suggestedTags: ['romantic', 'intimate', 'wine-list', 'fine-dining'],
    trending: true
  },
  {
    id: 'family-dinner',
    label: 'Family Dinner',
    icon: Users,
    description: 'Family-friendly spots with something for everyone',
    suggestedTags: ['family-friendly', 'kids-menu', 'casual-dining', 'large-portions']
  },
  {
    id: 'celebration',
    label: 'Celebration',
    icon: Sparkles,
    description: 'Special occasion dining and memorable experiences',
    suggestedTags: ['celebration', 'special-occasion', 'fine-dining', 'private-dining'],
    trending: true
  },
  {
    id: 'quick-lunch',
    label: 'Quick Lunch',
    icon: Clock,
    description: 'Fast, delicious options for busy schedules',
    suggestedTags: ['quick-service', 'lunch-special', 'takeout', 'under-30-minutes']
  },
  {
    id: 'business-meeting',
    label: 'Business Meeting',
    icon: Utensils,
    description: 'Professional atmosphere for work discussions',
    suggestedTags: ['business-lunch', 'quiet', 'professional', 'wifi']
  },
  {
    id: 'weekend-brunch',
    label: 'Weekend Brunch',
    icon: ChefHat,
    description: 'Perfect brunch spots for lazy weekends',
    suggestedTags: ['brunch', 'weekend', 'bottomless-mimosas', 'outdoor-seating']
  },
  {
    id: 'group-dining',
    label: 'Group Dining',
    icon: Users,
    description: 'Great for large groups and gatherings',
    suggestedTags: ['group-friendly', 'reservations', 'large-tables', 'sharing-plates']
  },
  {
    id: 'late-night',
    label: 'Late Night',
    icon: Clock,
    description: 'Open late for night owls and after-work crowds',
    suggestedTags: ['late-night', 'bar', 'happy-hour', 'comfort-food']
  }
];

const TRENDING_SEARCHES = [
  'Best pizza for date night',
  'Family-friendly brunch spots',
  'Romantic restaurants with outdoor seating',
  'Quick lunch near downtown',
  'Celebration dinner with private rooms',
  'Group dining with vegetarian options'
];

export function OccasionSearch({ onSearch, className }: OccasionSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Fetch trending occasions based on user activity
  const { data: trendingOccasions } = useQuery({
    queryKey: ['/api/search/trending-occasions'],
    queryFn: async () => {
      const response = await fetch('/api/search/trending-occasions');
      if (!response.ok) throw new Error('Failed to fetch trending occasions');
      return response.json();
    },
    staleTime: 300000, // 5 minutes
  });

  const handleOccasionClick = (occasion: PopularOccasion) => {
    const searchTerm = `Find restaurants for ${occasion.label.toLowerCase()}`;
    setSearchQuery(searchTerm);
    setSelectedTags(occasion.suggestedTags);
    onSearch(searchTerm, occasion.suggestedTags);
  };

  const handleTrendingSearchClick = (trendingSearch: string) => {
    setSearchQuery(trendingSearch);
    // Extract occasion-based tags from trending search
    const extractedTags = extractTagsFromQuery(trendingSearch);
    setSelectedTags(extractedTags);
    onSearch(trendingSearch, extractedTags);
  };

  const handleManualSearch = () => {
    if (searchQuery.trim()) {
      const extractedTags = extractTagsFromQuery(searchQuery);
      const combinedTags = [...new Set([...selectedTags, ...extractedTags])];
      onSearch(searchQuery, combinedTags);
    }
  };

  const extractTagsFromQuery = (query: string): string[] => {
    const tags: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Map query terms to relevant tags
    const tagMapping: Record<string, string[]> = {
      'date': ['date-night', 'romantic', 'intimate'],
      'family': ['family-friendly', 'kids-menu'],
      'celebration': ['celebration', 'special-occasion'],
      'quick': ['quick-service', 'fast'],
      'business': ['business-lunch', 'professional'],
      'brunch': ['brunch', 'weekend'],
      'group': ['group-friendly', 'large-tables'],
      'late': ['late-night'],
      'pizza': ['pizza', 'italian'],
      'romantic': ['romantic', 'intimate'],
      'outdoor': ['outdoor-seating'],
      'vegetarian': ['vegetarian', 'vegan']
    };

    Object.entries(tagMapping).forEach(([keyword, associatedTags]) => {
      if (lowerQuery.includes(keyword)) {
        tags.push(...associatedTags);
      }
    });

    return [...new Set(tags)];
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Find Restaurants for Any Occasion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manual Search Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder='Try "Find restaurants for date night" or "Best brunch spots"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleManualSearch} disabled={!searchQuery.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {selectedTags.map(tag => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-gray-200"
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <span className="ml-1 text-gray-500">×</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Popular Occasions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Popular Occasions</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {POPULAR_OCCASIONS.map(occasion => (
              <Button
                key={occasion.id}
                variant="outline"
                onClick={() => handleOccasionClick(occasion)}
                className="h-auto p-4 flex flex-col items-start text-left relative"
              >
                {occasion.trending && (
                  <Badge className="absolute -top-2 -right-2 bg-orange-500 text-xs px-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Hot
                  </Badge>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <occasion.icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{occasion.label}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {occasion.description}
                </p>
              </Button>
            ))}
          </div>
        </div>

        {/* Trending Searches */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">Trending Searches</span>
          </div>
          <div className="space-y-2">
            {TRENDING_SEARCHES.map((search, index) => (
              <Button
                key={index}
                variant="ghost"
                onClick={() => handleTrendingSearchClick(search)}
                className="justify-start h-auto p-2 text-left w-full"
              >
                <Search className="h-3 w-3 mr-2 text-gray-400" />
                <span className="text-sm">{search}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Pro Tips:</p>
              <ul className="text-blue-700 space-y-1 text-xs">
                <li>• Be specific: "date night with outdoor seating" finds better matches</li>
                <li>• Use occasion words: "celebration", "quick lunch", "family dinner"</li>
                <li>• Combine preferences: "vegetarian brunch spots with parking"</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}