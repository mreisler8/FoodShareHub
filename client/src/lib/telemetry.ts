import React from 'react';

/**
 * Client Telemetry System
 * 
 * Widget-level performance monitoring and error tracking for restaurant page.
 * Provides debugging insights without impacting production performance.
 */

interface TimingEvent {
  name: string;
  duration: number;
  restaurantId?: number | string;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface ErrorEvent {
  name: string;
  message: string;
  code?: string;
  restaurantId?: number | string;
  metadata?: Record<string, any>;
  timestamp: number;
}

class TelemetryCollector {
  private timings: TimingEvent[] = [];
  private errors: ErrorEvent[] = [];
  private isDebugMode: boolean = false;

  constructor() {
    // Check for debug mode
    this.isDebugMode = typeof window !== 'undefined' && 
      window.location.search.includes('debug=1');

    // Global error tracking integration
    if (typeof window !== 'undefined') {
      (window as any).trackError = this.trackError.bind(this);
      (window as any).trackTiming = this.trackTiming.bind(this);
    }
  }

  trackTiming(name: string, duration: number, metadata: { restaurantId?: number | string; [key: string]: any } = {}) {
    const event: TimingEvent = {
      name,
      duration,
      restaurantId: metadata.restaurantId,
      metadata,
      timestamp: Date.now()
    };

    this.timings.push(event);

    // Keep only recent events to prevent memory leaks
    if (this.timings.length > 100) {
      this.timings = this.timings.slice(-50);
    }

    if (this.isDebugMode) {
      console.log(`⏱️ ${name}: ${duration}ms`, metadata);
    }
  }

  trackError(name: string, details: { message: string; code?: string; restaurantId?: number | string; [key: string]: any }) {
    const event: ErrorEvent = {
      name,
      message: details.message,
      code: details.code,
      restaurantId: details.restaurantId,
      metadata: details,
      timestamp: Date.now()
    };

    this.errors.push(event);

    // Keep only recent errors to prevent memory leaks
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-25);
    }

    if (this.isDebugMode) {
      console.error(`❌ ${name}:`, details);
    }
  }

  getTimings(): TimingEvent[] {
    return [...this.timings];
  }

  getErrors(): ErrorEvent[] {
    return [...this.errors];
  }

  getWidgetStats(restaurantId: number | string) {
    const widgetTimings = this.timings.filter(t => t.restaurantId === restaurantId);
    const widgetErrors = this.errors.filter(e => e.restaurantId === restaurantId);

    return {
      timings: widgetTimings,
      errors: widgetErrors,
      avgLoadTime: widgetTimings.length > 0 
        ? widgetTimings.reduce((acc, t) => acc + t.duration, 0) / widgetTimings.length 
        : 0,
      errorRate: widgetErrors.length / Math.max(widgetTimings.length, 1)
    };
  }

  clear() {
    this.timings = [];
    this.errors = [];
  }
}

// Global instance
export const telemetry = new TelemetryCollector();

/**
 * Hook to track query/mutation performance
 */
export function useQueryTelemetry(queryName: string, restaurantId?: number | string) {
  const startTime = React.useRef<number>(Date.now());

  React.useEffect(() => {
    startTime.current = Date.now();
  }, [queryName, restaurantId]);

  const trackSuccess = React.useCallback((metadata: Record<string, any> = {}) => {
    const duration = Date.now() - startTime.current;
    telemetry.trackTiming(`${queryName}:success`, duration, {
      restaurantId,
      ...metadata
    });
  }, [queryName, restaurantId]);

  const trackError = React.useCallback((error: Error, metadata: Record<string, any> = {}) => {
    const duration = Date.now() - startTime.current;
    telemetry.trackTiming(`${queryName}:error`, duration, {
      restaurantId,
      ...metadata
    });
    telemetry.trackError(`${queryName}:error`, {
      message: error.message,
      restaurantId,
      ...metadata
    });
  }, [queryName, restaurantId]);

  return { trackSuccess, trackError };
}

/**
 * Performance measurement wrapper for async operations
 */
export function withTelemetry<T>(
  name: string,
  operation: () => Promise<T>,
  metadata: { restaurantId?: number | string; [key: string]: any } = {}
): Promise<T> {
  const startTime = Date.now();
  
  return operation()
    .then(result => {
      const duration = Date.now() - startTime;
      telemetry.trackTiming(`${name}:success`, duration, metadata);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      telemetry.trackTiming(`${name}:error`, duration, metadata);
      telemetry.trackError(`${name}:error`, {
        message: error.message,
        ...metadata
      });
      throw error;
    });
}

/**
 * Debug overlay component (only shown with ?debug=1)
 */
export function TelemetryDebugOverlay({ restaurantId }: { restaurantId?: number | string }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const stats = restaurantId ? telemetry.getWidgetStats(restaurantId) : null;

  React.useEffect(() => {
    const checkDebug = () => {
      setIsVisible(window.location.search.includes('debug=1'));
    };
    checkDebug();
    
    // Listen for URL changes
    const handlePopState = () => checkDebug();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!isVisible || !stats) return null;

  return React.createElement('div', {
    className: 'fixed bottom-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg shadow-lg max-w-sm z-50'
  }, [
    React.createElement('div', { className: 'font-bold mb-2', key: 'title' }, 'Widget Performance'),
    React.createElement('div', { key: 'avg' }, `Avg Load: ${Math.round(stats.avgLoadTime)}ms`),
    React.createElement('div', { key: 'error' }, `Error Rate: ${Math.round(stats.errorRate * 100)}%`),
    React.createElement('div', { key: 'events' }, `Recent Events: ${stats.timings.length}`),
    React.createElement('div', { key: 'errors' }, `Errors: ${stats.errors.length}`),
    React.createElement('button', {
      key: 'clear',
      onClick: () => telemetry.clear(),
      className: 'mt-2 text-yellow-300 hover:text-yellow-100'
    }, 'Clear')
  ]);
}

// Export types for use in other components
export type { TimingEvent, ErrorEvent };