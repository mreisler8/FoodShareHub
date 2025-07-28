import React from 'react';
import { cn } from '@/lib/utils';

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'page' | 'modal' | 'card';
}

/**
 * MVP-Ready Mobile Responsive Layout Component
 * Ensures consistent mobile experience across all components
 */
export function MobileResponsiveLayout({
  children,
  className,
  variant = 'page'
}: MobileResponsiveLayoutProps) {
  const baseClasses = {
    page: 'min-h-screen w-full overflow-x-hidden',
    modal: 'w-full max-w-lg mx-auto',
    card: 'w-full'
  };

  const responsiveClasses = {
    page: 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6',
    modal: 'px-4 py-6 max-h-[90vh] overflow-y-auto',
    card: 'p-3 sm:p-4 lg:p-6'
  };

  // Critical mobile optimizations
  const mobileOptimizations = {
    touchTargets: '[&_button]:min-h-[44px] [&_a]:min-h-[44px]',
    textSizing: '[&_h1]:text-xl [&_h1]:sm:text-2xl [&_h1]:lg:text-3xl [&_h2]:text-lg [&_h2]:sm:text-xl [&_h3]:text-base [&_h3]:sm:text-lg',
    spacing: '[&>*+*]:mt-4 [&>*+*]:sm:mt-6',
    overflow: 'overflow-x-hidden'
  };

  return (
    <div className={cn(
      baseClasses[variant],
      responsiveClasses[variant],
      mobileOptimizations.touchTargets,
      mobileOptimizations.textSizing,
      mobileOptimizations.spacing,
      mobileOptimizations.overflow,
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Mobile-First Grid Layout
 */
export function MobileGrid({
  children,
  columns = { xs: 1, sm: 2, lg: 3 },
  gap = 4,
  className
}: {
  children: React.ReactNode;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  className?: string;
}) {
  const gridClasses = cn(
    'grid',
    `gap-${gap}`,
    columns.xs && `grid-cols-${columns.xs}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

/**
 * Mobile-First Action Bar
 */
export function MobileActionBar({
  children,
  fixed = false,
  className
}: {
  children: React.ReactNode;
  fixed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-4 bg-white border-t',
      fixed && 'fixed bottom-0 left-0 right-0 z-50 md:relative md:border-t-0',
      !fixed && 'border-t',
      className
    )}>
      {children}
    </div>
  );
}

export default MobileResponsiveLayout;