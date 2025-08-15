import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  className?: string;
  children?: ReactNode;
}

/**
 * EmptyState - Standardized empty state component
 * 
 * Provides consistent empty states across all restaurant widgets.
 * Ensures proper visual hierarchy, messaging, and call-to-action patterns.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  children
}: EmptyStateProps) {
  return (
    <div className={`rounded-xl shadow-sm bg-white border p-8 ${className}`} role="region" aria-label={title}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Icon className="h-8 w-8 text-gray-400" aria-hidden="true" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        
        <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
          {description}
        </p>
        
        {action && (
          <Button
            size="sm"
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </Button>
        )}
        
        {children}
      </div>
    </div>
  );
}

/**
 * Predefined empty states for common restaurant scenarios
 */

export const EmptyStates = {
  noLists: (onAddToList?: () => void) => ({
    icon: require('lucide-react').ListChecks,
    title: "Not Listed Yet",
    description: "No one in your Circle has added this restaurant to a list yet. Be the first to curate!",
    action: onAddToList ? {
      label: "Add to List",
      onClick: onAddToList,
      variant: 'outline' as const
    } : undefined
  }),

  noPosts: (onQuickRate?: () => void) => ({
    icon: require('lucide-react').MessageCircle,
    title: "No Posts Yet", 
    description: "No posts yet from your Circles — be the first to share your experience!",
    action: onQuickRate ? {
      label: "Quick Rate",
      onClick: onQuickRate,
      variant: 'outline' as const
    } : undefined
  }),

  noRatings: (onRate?: () => void) => ({
    icon: require('lucide-react').Star,
    title: "No Ratings Yet",
    description: "Be the first to rate this restaurant and help your Circle discover great food!",
    action: onRate ? {
      label: "Rate Restaurant",
      onClick: onRate,
      variant: 'default' as const
    } : undefined
  }),

  noCircleScore: () => ({
    icon: require('lucide-react').Users,
    title: "No Circle Score Available",
    description: "Circle Scores show ratings from people you follow. Rate this restaurant to contribute to your network's recommendations."
  })
};