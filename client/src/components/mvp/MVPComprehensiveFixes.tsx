import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

/**
 * MVP Comprehensive Fixes Component
 * Addresses all three critical MVP issues with production-ready solutions
 */

// 1. Circle Score Display Consistency Fix
export function useEnhancedCircleScore({ restaurantId, googlePlaceId }: {
  restaurantId?: number;
  googlePlaceId?: string;
}) {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ['/api/circle-score', restaurantId || googlePlaceId, restaurantId ? 'restaurant' : 'google_place'],
    queryFn: async () => {
      if (!restaurantId && !googlePlaceId) {
        return null;
      }

      const url = restaurantId 
        ? `/api/circle-score/${restaurantId}?type=restaurant`
        : `/api/circle-score/${encodeURIComponent(googlePlaceId!)}?type=google_place`;

      try {
        const response = await fetch(url);
        
        // Handle 404 gracefully - no Circle Score data available
        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          if (response.status === 401) {
            toast({
              title: "Authentication Required",
              description: "Please log in to view Circle Scores",
              variant: "destructive"
            });
            return null;
          }
          throw new Error(`Failed to fetch Circle Score: ${response.status}`);
        }

        const data = await response.json();
        return data || null;
      } catch (error) {
        if (isUnauthorizedError(error as Error)) {
          setTimeout(() => {
            window.location.href = "/api/login";
          }, 500);
          return null;
        }
        
        console.error('Circle Score fetch error:', error);
        // Don't toast on every error - just return null for graceful degradation
        return null;
      }
    },
    enabled: !!(restaurantId || googlePlaceId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (no data) or 401 (unauthorized)
      if ((error as any)?.message?.includes('404') || (error as any)?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

// 2. Search Reliability Enhancement
export function useEnhancedSearch() {
  const { toast } = useToast();

  const performSearch = async (query: string, type: 'restaurants' | 'users' | 'all' = 'restaurants') => {
    if (!query.trim()) {
      return { results: [] };
    }

    try {
      const endpoint = type === 'all' 
        ? `/api/search/unified?q=${encodeURIComponent(query)}`
        : `/api/search/${type}?q=${encodeURIComponent(query)}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout for reliability
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { results: [] };
        }
        
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in to search",
            variant: "destructive"
          });
          setTimeout(() => {
            window.location.href = "/api/login";
          }, 500);
          return { results: [] };
        }

        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Normalize response format for consistency
      if (type === 'all') {
        return data; // Already in correct format
      } else {
        return { results: data.results || data || [] };
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Search Timeout",
          description: "Search took too long. Please try again.",
          variant: "destructive"
        });
        return { results: [] };
      }

      if (isUnauthorizedError(error as Error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return { results: [] };
      }

      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Search temporarily unavailable. Please try again.",
        variant: "destructive"
      });
      return { results: [] };
    }
  };

  return { performSearch };
}

// 3. Mobile Responsiveness Utilities
export const mobileBreakpoints = {
  xs: '(max-width: 475px)',
  sm: '(max-width: 640px)',
  md: '(max-width: 768px)',
  lg: '(max-width: 1024px)'
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia(mobileBreakpoints.md).matches);
    };

    checkMobile();
    
    const mediaQuery = window.matchMedia(mobileBreakpoints.md);
    mediaQuery.addEventListener('change', checkMobile);
    
    return () => mediaQuery.removeEventListener('change', checkMobile);
  }, []);

  return isMobile;
}

// Mobile-optimized touch target validation
export function validateTouchTargets() {
  if (typeof window === 'undefined') return;

  const buttons = document.querySelectorAll('button, a[role="button"], [tabindex]');
  const problematicElements: Element[] = [];

  buttons.forEach(button => {
    const rect = button.getBoundingClientRect();
    const minSize = 44; // iOS/Android minimum recommended touch target

    if (rect.width < minSize || rect.height < minSize) {
      problematicElements.push(button);
    }
  });

  if (problematicElements.length > 0) {
    console.warn(`Found ${problematicElements.length} touch targets smaller than 44px:`, problematicElements);
  }

  return problematicElements;
}

// Viewport optimization for mobile
export function optimizeViewport() {
  if (typeof window === 'undefined') return;

  // Prevent zoom on input focus (iOS)
  const metaViewport = document.querySelector('meta[name="viewport"]');
  if (metaViewport) {
    metaViewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }

  // Add safe area support for notched devices
  document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
  document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
  document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
  document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
}

// Initialize all MVP optimizations
export function initializeMVPOptimizations() {
  React.useEffect(() => {
    optimizeViewport();
    
    // Validate touch targets in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(validateTouchTargets, 1000);
    }
  }, []);
}

export default {
  useEnhancedCircleScore,
  useEnhancedSearch,
  useIsMobile,
  validateTouchTargets,
  optimizeViewport,
  initializeMVPOptimizations
};