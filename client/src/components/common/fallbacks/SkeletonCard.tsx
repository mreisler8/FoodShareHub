import React from 'react';

interface SkeletonCardProps {
  className?: string;
  lines?: number;
  showHeader?: boolean;
  showActions?: boolean;
}

/**
 * SkeletonCard - Standardized loading skeleton for widget sections
 * 
 * Provides consistent loading states with proper sizing to prevent layout shift.
 * Used for below-the-fold content and secondary widgets.
 */
export function SkeletonCard({ 
  className = "",
  lines = 3,
  showHeader = true,
  showActions = false 
}: SkeletonCardProps) {
  return (
    <div className={`rounded-xl shadow-sm bg-white border p-6 ${className}`}>
      <div className="animate-pulse">
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-8"></div>
          </div>
        )}
        
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              {i === 0 && <div className="h-4 bg-gray-200 rounded w-3/4"></div>}
            </div>
          ))}
        </div>
        
        {showActions && (
          <div className="flex gap-2 mt-4">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Specialized skeletons for specific restaurant page sections
 */

export function RestaurantHeaderSkeleton() {
  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      <div className="animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScoreStripSkeleton() {
  return (
    <div className="flex justify-center items-center gap-12 mb-6 bg-white rounded-xl p-6 shadow-sm border">
      <div className="animate-pulse flex gap-12">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-16 w-px bg-gray-200"></div>
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

export function ActionBarSkeleton() {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 rounded w-20"></div>
            <div className="h-10 bg-gray-200 rounded w-16"></div>
            <div className="h-10 bg-gray-200 rounded w-18"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-12"></div>
        </div>
      </div>
    </div>
  );
}