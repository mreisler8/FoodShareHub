import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Info, Shield, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CircleScoreData } from '@/components/circle-score/CircleScoreCard';

interface TrustScoreSectionProps {
  circleScore: CircleScoreData | null;
  isLoading?: boolean;
  className?: string;
}

export default function TrustScoreSection({ 
  circleScore, 
  isLoading = false, 
  className 
}: TrustScoreSectionProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/10 text-green-700 border-green-200';
    if (score >= 70) return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
    return 'bg-red-500/10 text-red-700 border-red-200';
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return '🛡️';
      case 'moderate': return '⚖️';
      case 'low': return '📊';
      default: return '❓';
    }
  };

  const formatContributorText = (contributors: CircleScoreData['contributors']) => {
    if (contributors.length === 0) return "No data from your circles";
    
    const recentContributors = contributors.filter(c => c.recency <= 30);
    const circleCount = new Set(contributors.map(c => c.userId)).size;
    
    if (recentContributors.length >= 5) {
      return `Based on ${contributors.length} ratings from ${circleCount} circles`;
    }
    return `Based on ${contributors.length} ratings from ${circleCount} trusted sources`;
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                  <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                  <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!circleScore) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Circle Score</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Circle Scores show ratings from people you follow and circles you're in. 
                      As your network grows and rates restaurants, you'll see personalized scores here.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-400">N/A</span>
                </div>
                <div className="text-sm text-muted-foreground mt-2">No Score Yet</div>
              </div>
              
              <div className="flex-1">
                <Badge variant="outline" className="mb-3">
                  Not yet rated by your circles
                </Badge>
                <p className="text-sm text-muted-foreground">
                  No ratings from your trusted network yet. Be the first to rate this restaurant 
                  and help your friends discover great food!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Circle Score</h3>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs cursor-help", getScoreColor(circleScore.score))}
                    >
                      {getConfidenceIcon(circleScore.confidence)} {circleScore.confidence} confidence
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{formatContributorText(circleScore.contributors)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Popular</span>
              </div>
            </div>
          </div>

          {/* Score Display */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center border-2",
                getScoreColor(circleScore.score)
              )}>
                <span className="text-2xl font-bold">{circleScore.score}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">Circle Score</div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">
                  Rated by {circleScore.totalContributors} in your network
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {formatContributorText(circleScore.contributors)}
              </p>

              {/* Social Proof Avatars */}
              {circleScore.contributors.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {circleScore.contributors.slice(0, 4).map((contributor, index) => (
                      <TooltipProvider key={contributor.userId}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-8 w-8 border-2 border-white cursor-help">
                              <AvatarFallback className="text-xs">
                                {contributor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-medium">{contributor.name}</p>
                              <p className="text-muted-foreground">
                                {contributor.actionType === 'rating' ? `Rated ${contributor.value}/5` : 
                                 contributor.actionType === 'list_placement' ? `Added to list (#${contributor.value})` : 
                                 'Interacted'} · {contributor.recency} days ago
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                  
                  {circleScore.contributors.length > 4 && (
                    <span className="text-sm text-muted-foreground">
                      +{circleScore.contributors.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex items-center gap-6 pt-4 border-t">
            {circleScore.breakdown.quickRatings > 0 && (
              <div className="text-center">
                <div className="text-lg font-semibold">{circleScore.breakdown.quickRatings}</div>
                <div className="text-xs text-muted-foreground">Quick Ratings</div>
              </div>
            )}
            {circleScore.breakdown.listPlacements > 0 && (
              <div className="text-center">
                <div className="text-lg font-semibold">{circleScore.breakdown.listPlacements}</div>
                <div className="text-xs text-muted-foreground">List Mentions</div>
              </div>
            )}
            {circleScore.breakdown.reactions > 0 && (
              <div className="text-center">
                <div className="text-lg font-semibold">{circleScore.breakdown.reactions}</div>
                <div className="text-xs text-muted-foreground">Reactions</div>
              </div>
            )}
            {circleScore.breakdown.saves > 0 && (
              <div className="text-center">
                <div className="text-lg font-semibold">{circleScore.breakdown.saves}</div>
                <div className="text-xs text-muted-foreground">Saves</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}