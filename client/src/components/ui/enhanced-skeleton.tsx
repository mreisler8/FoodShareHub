import React from "react";
import { cn } from "@/lib/utils";

interface EnhancedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'list-item' | 'restaurant' | 'feed-item';
  lines?: number;
  showAvatar?: boolean;
  animated?: boolean;
}

function EnhancedSkeleton({ 
  className, 
  variant = 'default',
  lines = 1,
  showAvatar = false,
  animated = true,
  ...props 
}: EnhancedSkeletonProps) {
  const baseClasses = cn(
    "bg-slate-200 rounded-md",
    animated && "animate-pulse",
    className
  );
  
  if (variant === 'card') {
    return (
      <div className="space-y-3 p-4 border rounded-lg bg-white" {...props}>
        <div className="flex items-center space-x-3">
          {showAvatar && <div className={cn(baseClasses, "h-10 w-10 rounded-full")} />}
          <div className="space-y-2 flex-1">
            <div className={cn(baseClasses, "h-4 w-3/4")} />
            <div className={cn(baseClasses, "h-3 w-1/2")} />
          </div>
        </div>
        <div className={cn(baseClasses, "h-32 w-full rounded-md")} />
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className={cn(baseClasses, "h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
          ))}
        </div>
      </div>
    );
  }
  
  if (variant === 'list-item') {
    return (
      <div className="flex items-center space-x-3 p-3 border-b" {...props}>
        <div className={cn(baseClasses, "h-12 w-12 rounded-md")} />
        <div className="space-y-2 flex-1">
          <div className={cn(baseClasses, "h-4 w-3/4")} />
          <div className={cn(baseClasses, "h-3 w-1/2")} />
        </div>
        <div className={cn(baseClasses, "h-8 w-16 rounded-full")} />
      </div>
    );
  }
  
  if (variant === 'restaurant') {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-white" {...props}>
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className={cn(baseClasses, "h-6 w-3/4")} />
            <div className={cn(baseClasses, "h-4 w-1/2")} />
          </div>
          <div className={cn(baseClasses, "h-8 w-20 rounded-full")} />
        </div>
        <div className="flex items-center space-x-2">
          <div className={cn(baseClasses, "h-4 w-4 rounded-full")} />
          <div className={cn(baseClasses, "h-4 w-16")} />
          <div className={cn(baseClasses, "h-4 w-12")} />
        </div>
        <div className={cn(baseClasses, "h-24 w-full rounded-md")} />
      </div>
    );
  }
  
  if (variant === 'feed-item') {
    return (
      <div className="space-y-3 p-4 border rounded-lg bg-white" {...props}>
        <div className="flex items-center space-x-3">
          <div className={cn(baseClasses, "h-8 w-8 rounded-full")} />
          <div className="space-y-1 flex-1">
            <div className={cn(baseClasses, "h-4 w-24")} />
            <div className={cn(baseClasses, "h-3 w-16")} />
          </div>
        </div>
        <div className={cn(baseClasses, "h-4 w-full")} />
        <div className={cn(baseClasses, "h-4 w-4/5")} />
        <div className={cn(baseClasses, "h-32 w-full rounded-md")} />
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <div className={cn(baseClasses, "h-8 w-16 rounded-full")} />
            <div className={cn(baseClasses, "h-8 w-16 rounded-full")} />
          </div>
          <div className={cn(baseClasses, "h-6 w-12")} />
        </div>
      </div>
    );
  }
  
  // Default variant
  return (
    <div className={baseClasses} {...props} />
  );
}

// Specialized skeleton components
export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <EnhancedSkeleton key={i} variant="feed-item" lines={2} />
      ))}
    </div>
  );
}

export function RestaurantListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <EnhancedSkeleton key={i} variant="list-item" />
      ))}
    </div>
  );
}

export function RestaurantCardSkeleton() {
  return <EnhancedSkeleton variant="restaurant" />;
}

export { EnhancedSkeleton };