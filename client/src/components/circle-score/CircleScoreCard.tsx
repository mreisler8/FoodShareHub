import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Users, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CircleScoreData {
  score: number; // 0-100
  confidence: "low" | "moderate" | "high";
  contributors: Array<{
    userId: number;
    username: string;
    name: string;
    actionType: 'rating' | 'list_placement' | 'reaction' | 'save';
    value: number;
    recency: number; // days ago
  }>;
  totalContributors: number;
  breakdown: {
    quickRatings: number;
    listPlacements: number;
    reactions: number;
    saves: number;
  };
}

interface CircleScoreCardProps {
  data: CircleScoreData | null; // Allow null for N/A states
  variant?: 'compact' | 'detailed';
  showTrend?: boolean;
  className?: string;
  isLoading?: boolean;
}

export default function CircleScoreCard({ 
  data, 
  variant = 'detailed', 
  showTrend = false,
  className,
  isLoading = false
}: CircleScoreCardProps) {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'High confidence';
      case 'moderate': return 'Moderate confidence';
      case 'low': return 'Limited data';
      default: return 'No data';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatContributorText = (contributors: CircleScoreData['contributors']) => {
    if (contributors.length === 0) return "No data from your circle";
    if (contributors.length === 1) return `Based on ${contributors.length} rating from your trusted network`;
    return `Based on ${contributors.length} ratings from your trusted network`;
  };

  // Handle loading state
  if (isLoading) {
    if (variant === 'compact') {
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <div className="animate-pulse bg-gray-200 rounded px-3 py-1 w-32 h-6"></div>
        </div>
      );
    }
    
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle N/A state (no data)
  if (!data) {
    if (variant === 'compact') {
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <Badge variant="outline" className="px-2 py-1 text-gray-600 bg-gray-50">
            Circle Score: N/A
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs text-gray-500 bg-gray-50">
                  No data
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">No ratings from your trusted network yet</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }

    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Your Circle's Take</h3>
            </div>

            {/* N/A Score Display */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-400">
                  N/A
                </div>
                <div className="text-sm text-muted-foreground">Circle Score</div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs text-gray-600 bg-gray-50">
                    No data
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  No ratings from your trusted network yet
                </p>
                <p className="text-xs text-gray-500">
                  Circle Scores show ratings from people you follow and circles you're in. 
                  As your network grows and rates restaurants, you'll see personalized scores here.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="secondary" className="px-2 py-1">
          🔥 Circle Score: {data.score}
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn("text-xs", getConfidenceColor(data.confidence))}
              >
                {data.confidence}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm font-medium">{formatContributorText(data.contributors)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Your Circle's Take</h3>
            {showTrend && (
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Trending up</span>
              </div>
            )}
          </div>

          {/* Score Display */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={cn("text-3xl font-bold", getScoreColor(data.score))}>
                {data.score}
              </div>
              <div className="text-sm text-muted-foreground">Circle Score</div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getConfidenceColor(data.confidence))}
                >
                  {getConfidenceText(data.confidence)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatContributorText(data.contributors)}
                </span>
              </div>
              
              {/* Breakdown */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {data.breakdown.quickRatings > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {data.breakdown.quickRatings} ratings
                  </div>
                )}
                {data.breakdown.listPlacements > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {data.breakdown.listPlacements} lists
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contributors */}
          {data.contributors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Activity</span>
              </div>
              
              <div className="space-y-2">
                {data.contributors.slice(0, 3).map((contributor) => (
                  <div key={contributor.userId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {contributor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{contributor.name}</span>
                      {contributor.actionType === 'rating' && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{contributor.value}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">
                        {contributor.recency === 0 ? 'Today' :
                         contributor.recency === 1 ? '1d ago' :
                         contributor.recency < 7 ? `${contributor.recency}d ago` :
                         contributor.recency < 30 ? `${Math.floor(contributor.recency / 7)}w ago` :
                         `${Math.floor(contributor.recency / 30)}mo ago`}
                      </span>
                    </div>
                  </div>
                ))}
                
                {data.contributors.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    +{data.contributors.length - 3} more from your trusted network
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}