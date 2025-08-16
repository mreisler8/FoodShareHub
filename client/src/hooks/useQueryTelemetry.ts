import { useCallback, useRef } from 'react';

/**
 * Query Telemetry Hook
 * 
 * Provides performance tracking and error monitoring for query operations.
 * Implements error boundaries with N/A fallbacks per user preferences.
 */
export function useQueryTelemetry(namespace: string, identifier?: string | number) {
  const timersRef = useRef<Map<string, number>>(new Map());
  const errorsRef = useRef<Map<string, number>>(new Map());

  const trackSuccess = useCallback((operation: string, duration?: number) => {
    try {
      const key = `${namespace}.${operation}`;
      const operationId = identifier ? `${key}:${identifier}` : key;
      
      if (import.meta.env.DEV) {
        console.debug(`[Telemetry] Success: ${operationId}${duration ? ` (${duration}ms)` : ''}`);
      }
      
      // Reset error count on success
      errorsRef.current.delete(operationId);
    } catch (error) {
      // Telemetry failures should not break application
      console.warn('[Telemetry] trackSuccess failed:', error);
    }
  }, [namespace, identifier]);

  const trackError = useCallback((operation: string, error: unknown) => {
    try {
      const key = `${namespace}.${operation}`;
      const operationId = identifier ? `${key}:${identifier}` : key;
      
      const currentCount = errorsRef.current.get(operationId) || 0;
      errorsRef.current.set(operationId, currentCount + 1);
      
      if (import.meta.env.DEV) {
        console.warn(`[Telemetry] Error: ${operationId} (count: ${currentCount + 1})`, error);
      }
      
      // Circuit breaker for repeated errors
      if (currentCount >= 5) {
        console.warn(`[Telemetry] Circuit breaker: ${operationId} has too many errors, consider fallback`);
      }
    } catch (telemetryError) {
      // Telemetry failures should not break application
      console.warn('[Telemetry] trackError failed:', telemetryError);
    }
  }, [namespace, identifier]);

  const startTimer = useCallback((operation: string) => {
    try {
      const key = `${namespace}.${operation}`;
      const operationId = identifier ? `${key}:${identifier}` : key;
      timersRef.current.set(operationId, Date.now());
    } catch (error) {
      console.warn('[Telemetry] startTimer failed:', error);
    }
  }, [namespace, identifier]);

  const endTimer = useCallback((operation: string) => {
    try {
      const key = `${namespace}.${operation}`;
      const operationId = identifier ? `${key}:${identifier}` : key;
      const startTime = timersRef.current.get(operationId);
      
      if (startTime) {
        const duration = Date.now() - startTime;
        timersRef.current.delete(operationId);
        trackSuccess(operation, duration);
        return duration;
      }
      
      return 0;
    } catch (error) {
      console.warn('[Telemetry] endTimer failed:', error);
      return 0;
    }
  }, [namespace, identifier, trackSuccess]);

  return {
    trackSuccess,
    trackError,
    startTimer,
    endTimer
  };
}