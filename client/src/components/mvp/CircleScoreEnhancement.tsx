import React from 'react';
import { useStandardizedRestaurantQueries } from '@/hooks/useStandardizedRestaurantQueries';
import CircleScoreCard from '@/components/circle-score/CircleScoreCard';

interface CircleScoreEnhancementProps {
  restaurantId?: number;
  googlePlaceId?: string;
  variant?: 'compact' | 'detailed';
  className?: string;
}

/**
 * MVP-Ready Circle Score Enhancement Component
 * Handles all edge cases and provides consistent display across all components
 */
export function CircleScoreEnhancement({
  restaurantId,
  googlePlaceId,
  variant = 'detailed',
  className
}: CircleScoreEnhancementProps) {
  // CRITICAL: Use standardized queries for cache consistency
  const { circleScore, isLoading, hasError } = useStandardizedRestaurantQueries({
    id: restaurantId,
    googlePlaceId,
    name: 'Loading...' // Required by hook interface
  });
  
  // Transform standardized data to CircleScoreCard format
  const circleScoreData = circleScore?.data ? {
    score: circleScore.data.score || 0,
    confidence: (circleScore.data.confidence === 'medium' ? 'moderate' : circleScore.data.confidence) as 'low' | 'moderate' | 'high' || 'low',
    contributors: [], // Will be populated when detailed breakdown is needed
    totalContributors: circleScore.data.ratingsCount || 0,
    breakdown: {
      quickRatings: circleScore.data.ratingsCount || 0,
      listPlacements: 0,
      reactions: 0,
      saves: 0
    }
  } : null;
  
  const error = hasError;

  // Handle error state gracefully
  if (error) {
    console.error('Circle Score error:', error);
    return (
      <CircleScoreCard 
        data={null}
        variant={variant}
        className={className}
        isLoading={false}
      />
    );
  }

  // Always render with proper state handling
  return (
    <CircleScoreCard 
      data={circleScoreData || null}
      variant={variant}
      className={className}
      isLoading={isLoading}
    />
  );
}

export default CircleScoreEnhancement;