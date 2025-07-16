import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PostTypeSelector, PostType } from './PostTypeSelector';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Sparkles, 
  Users, 
  ArrowRight,
  Clock,
  Star
} from 'lucide-react';

interface SmartPostTypeSelectorProps {
  selectedType: PostType | null;
  onTypeSelect: (type: PostType) => void;
  onBack?: () => void;
  className?: string;
}

interface UserStats {
  totalPosts: number;
  postTypeBreakdown: {
    list: number;
    moment: number;
    dish: number;
  };
  lastPostType?: PostType;
  accountAgeInDays: number;
  circleCount: number;
}

interface SmartRecommendation {
  type: PostType;
  reason: string;
  confidence: number;
  nudgeText: string;
  icon: React.ReactNode;
}

export function SmartPostTypeSelector({
  selectedType,
  onTypeSelect,
  onBack,
  className = ''
}: SmartPostTypeSelectorProps) {
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Fetch user stats for smart recommendations
  const { data: userStats } = useQuery<UserStats>({
    queryKey: ['/api/users/stats'],
    queryFn: async () => {
      const response = await fetch('/api/users/stats');
      return response.json();
    },
  });

  // Generate smart recommendations based on user history
  const getSmartRecommendations = (): SmartRecommendation[] => {
    if (!userStats || !userStats.postTypeBreakdown) return [];

    const recommendations: SmartRecommendation[] = [];
    
    // New user nudge (less than 7 days, fewer than 3 posts)
    if (userStats.accountAgeInDays < 7 && userStats.totalPosts < 3) {
      recommendations.push({
        type: 'moment',
        reason: 'Perfect for getting started',
        confidence: 0.9,
        nudgeText: 'Share your first food experience! Photos make it engaging.',
        icon: <Sparkles className="w-4 h-4" />
      });
    }

    // Active member with circles nudge
    if (userStats.circleCount > 0 && (userStats.postTypeBreakdown.list || 0) < 2) {
      recommendations.push({
        type: 'list',
        reason: 'Great for sharing with your circles',
        confidence: 0.8,
        nudgeText: 'Your circles would love a curated list of spots!',
        icon: <Users className="w-4 h-4" />
      });
    }

    // Trending post type nudge
    if ((userStats.postTypeBreakdown.dish || 0) === 0) {
      recommendations.push({
        type: 'dish',
        reason: 'Trending with food enthusiasts',
        confidence: 0.7,
        nudgeText: 'Dish recommendations are getting lots of engagement!',
        icon: <TrendingUp className="w-4 h-4" />
      });
    }

    // Repeat last successful type
    if (userStats.lastPostType && userStats.totalPosts > 5) {
      recommendations.push({
        type: userStats.lastPostType,
        reason: 'You\'ve had success with this format',
        confidence: 0.6,
        nudgeText: 'Continue with what works for you',
        icon: <Star className="w-4 h-4" />
      });
    }

    return recommendations.slice(0, 2); // Show max 2 recommendations
  };

  const recommendations = getSmartRecommendations();

  const handleRecommendationClick = (type: PostType) => {
    // Track analytics
    if (typeof window !== 'undefined') {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'smart_recommendation_used',
          data: { recommendedType: type }
        })
      });
    }
    
    onTypeSelect(type);
  };

  // If API failed or no recommendations, show regular selector
  const shouldShowRecommendations = showRecommendations && recommendations.length > 0;

  if (selectedType) {
    return (
      <PostTypeSelector
        selectedType={selectedType}
        onTypeSelect={onTypeSelect}
        onBack={onBack}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Smart Recommendations */}
      {shouldShowRecommendations && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Recommended for you
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecommendations(false)}
            >
              Show all
            </Button>
          </div>

          <div className="grid gap-3">
            {recommendations.map((rec, index) => (
              <Card
                key={index}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/30"
                onClick={() => handleRecommendationClick(rec.type)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {rec.icon}
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(rec.confidence * 100)}% match
                    </Badge>
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium capitalize">{rec.type}</div>
                    <div className="text-sm text-muted-foreground">{rec.nudgeText}</div>
                  </div>
                  
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>

          <div className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRecommendations(false)}
              className="w-full"
            >
              Or choose from all post types
            </Button>
          </div>
        </div>
      )}

      {/* Default Post Type Selector */}
      {!shouldShowRecommendations && (
        <PostTypeSelector
          selectedType={selectedType}
          onTypeSelect={onTypeSelect}
          onBack={onBack}
          className={className}
        />
      )}
    </div>
  );
}