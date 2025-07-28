import React from 'react';
import { useCircleScore } from '@/hooks/useCircleScore';
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
  const { data: circleScore, isLoading, error } = useCircleScore({
    restaurantId,
    googlePlaceId,
    enabled: !!(restaurantId || googlePlaceId)
  });

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
      data={circleScore || null}
      variant={variant}
      className={className}
      isLoading={isLoading}
    />
  );
}

export default CircleScoreEnhancement;