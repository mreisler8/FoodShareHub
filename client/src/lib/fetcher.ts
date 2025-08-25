import React from 'react';
import { telemetry } from './telemetry';

/**
 * Resilient Fetcher with AbortController and jittered retry
 * 
 * Provides consistent network handling across all restaurant widgets.
 * Includes cancellation, smart retries, and telemetry integration.
 */

interface FetcherOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  jitter?: boolean;
  telemetryName?: string;
  restaurantId?: number | string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  jitter: boolean;
}

class NetworkFetcher {
  private activeRequests = new Map<string, AbortController>();
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 2,
    baseDelay: 100, // Base 100ms delay
    jitter: true
  };

  /**
   * Fetch with automatic cancellation, retry, and telemetry
   */
  async fetch(
    url: string, 
    options: FetcherOptions = {}
  ): Promise<Response> {
    const {
      timeout = 10000,
      retries = this.defaultRetryConfig.maxRetries,
      jitter = this.defaultRetryConfig.jitter,
      telemetryName = 'fetch',
      restaurantId,
      signal,
      ...fetchOptions
    } = options;

    // Create abort controller for request cancellation
    const abortController = new AbortController();
    const requestId = `${telemetryName}_${Date.now()}_${Math.random()}`;
    
    // Track active requests for cleanup
    this.activeRequests.set(requestId, abortController);

    // Chain signals - respect provided signal and our own
    if (signal) {
      signal.addEventListener('abort', () => {
        abortController.abort();
      });
    }

    // Timeout handling
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);

    const startTime = Date.now();

    try {
      const response = await this.fetchWithRetry(
        url,
        {
          ...fetchOptions,
          signal: abortController.signal
        },
        retries,
        jitter
      );

      // Track successful request
      const duration = Date.now() - startTime;
      telemetry.trackTiming(`${telemetryName}:success`, duration, {
        url,
        status: response.status,
        restaurantId
      });

      return response;

    } catch (error) {
      // Track failed request
      const duration = Date.now() - startTime;
      telemetry.trackError(`${telemetryName}:error`, {
        message: error instanceof Error ? error.message : 'Unknown fetch error',
        url,
        restaurantId
      });

      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number,
    useJitter: boolean
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Only retry on server errors (5xx) or network errors, not client errors (4xx)
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // Server error, prepare for retry
        if (attempt < maxRetries) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } else {
          return response; // Return last response even if not ok
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Fetch failed');
        
        // Don't retry if aborted
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        await this.delay(this.calculateDelay(attempt, useJitter));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private calculateDelay(attempt: number, useJitter: boolean): number {
    const baseDelay = this.defaultRetryConfig.baseDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    
    if (!useJitter) return exponentialDelay;
    
    // Add jitter to prevent thundering herd
    const jitterRange = exponentialDelay * 0.5; // ±50% jitter
    const jitter = (Math.random() - 0.5) * jitterRange;
    
    return Math.max(0, exponentialDelay + jitter);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel all active requests (useful for component unmount)
   */
  cancelAll(): void {
    Array.from(this.activeRequests.entries()).forEach(([requestId, controller]) => {
      controller.abort();
      this.activeRequests.delete(requestId);
    });
  }

  /**
   * Cancel specific request by pattern
   */
  cancelByPattern(pattern: string): void {
    Array.from(this.activeRequests.entries()).forEach(([requestId, controller]) => {
      if (requestId.includes(pattern)) {
        controller.abort();
        this.activeRequests.delete(requestId);
      }
    });
  }

  /**
   * Get active request count (for debugging)
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}

// Global fetcher instance
export const networkFetcher = new NetworkFetcher();

/**
 * Enhanced version of apiRequest with resilience features
 */
export async function resilientApiRequest(
  url: string,
  options: FetcherOptions = {}
): Promise<Response> {
  return networkFetcher.fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

/**
 * React hook for automatic request cancellation on unmount
 */
export function useRequestCancellation(pattern?: string) {
  React.useEffect(() => {
    return () => {
      if (pattern) {
        networkFetcher.cancelByPattern(pattern);
      } else {
        networkFetcher.cancelAll();
      }
    };
  }, [pattern]);
}

/**
 * Hook for request with automatic telemetry and cancellation
 */
export function useResilientQuery(
  queryName: string,
  restaurantId?: number | string
) {
  const abortControllerRef = React.useRef<AbortController | undefined>();

  React.useEffect(() => {
    abortControllerRef.current = new AbortController();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [queryName, restaurantId]);

  const fetch = React.useCallback(
    (url: string, options: FetcherOptions = {}) => {
      return resilientApiRequest(url, {
        ...options,
        signal: abortControllerRef.current?.signal,
        telemetryName: queryName,
        restaurantId
      });
    },
    [queryName, restaurantId]
  );

  return { fetch };
}

export default networkFetcher;