
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface SmartPollingOptions {
  queryKey: string[];
  enabled?: boolean;
  baseInterval?: number;
  maxInterval?: number;
  backoffMultiplier?: number;
  activityThreshold?: number;
}

// Global request tracker to prevent duplicate requests
const activeRequests = new Set<string>();
const requestQueue = new Map<string, Promise<any>>();

export function useSmartPolling({
  queryKey,
  enabled = true,
  baseInterval = 60000, // 1 minute default (reduced from 30 seconds)
  maxInterval = 600000, // 10 minutes max
  backoffMultiplier = 1.5,
  activityThreshold = 120000 // 2 minutes
}: SmartPollingOptions) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef(Date.now());
  const currentIntervalRef = useRef(baseInterval);
  const consecutiveFailuresRef = useRef(0);

  const queryKeyString = JSON.stringify(queryKey);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      // Reset to base interval on activity
      currentIntervalRef.current = baseInterval;
      consecutiveFailuresRef.current = 0;
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [baseInterval]);

  const executeQuery = useCallback(async () => {
    // Prevent duplicate requests
    if (activeRequests.has(queryKeyString)) {
      console.log(`Request deduplication: ${queryKeyString} already in progress`);
      return requestQueue.get(queryKeyString);
    }

    const timeSinceActivity = Date.now() - lastActivityRef.current;
    const isUserActive = timeSinceActivity < activityThreshold;

    // Skip polling if user is inactive and we haven't had any recent activity
    if (!isUserActive && timeSinceActivity > maxInterval) {
      console.log(`Skipping polling for inactive user: ${queryKeyString}`);
      return;
    }

    activeRequests.add(queryKeyString);
    
    const queryPromise = queryClient.fetchQuery({
      queryKey,
      staleTime: isUserActive ? 30000 : 120000, // Different stale times based on activity
    }).then(result => {
      // Success - reset failure count
      consecutiveFailuresRef.current = 0;
      currentIntervalRef.current = isUserActive ? baseInterval : Math.min(baseInterval * 2, maxInterval);
      return result;
    }).catch(error => {
      // Handle failures with exponential backoff
      consecutiveFailuresRef.current += 1;
      const backoffInterval = Math.min(
        baseInterval * Math.pow(backoffMultiplier, consecutiveFailuresRef.current),
        maxInterval
      );
      currentIntervalRef.current = backoffInterval;
      console.warn(`Polling failed for ${queryKeyString}, backing off to ${backoffInterval}ms:`, error);
      throw error;
    }).finally(() => {
      activeRequests.delete(queryKeyString);
      requestQueue.delete(queryKeyString);
    });

    requestQueue.set(queryKeyString, queryPromise);
    return queryPromise;
  }, [queryKey, queryKeyString, queryClient, activityThreshold, baseInterval, maxInterval, backoffMultiplier]);

  // Set up smart polling
  useEffect(() => {
    if (!enabled) return;

    const startPolling = () => {
      const poll = async () => {
        try {
          await executeQuery();
        } catch (error) {
          // Error handling is done in executeQuery
        }

        // Schedule next poll with current interval
        intervalRef.current = setTimeout(poll, currentIntervalRef.current);
      };

      // Start first poll
      poll();
    };

    startPolling();

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      activeRequests.delete(queryKeyString);
      requestQueue.delete(queryKeyString);
    };
  }, [enabled, executeQuery, queryKeyString]);

  // Return current polling status
  return {
    currentInterval: currentIntervalRef.current,
    isActive: Date.now() - lastActivityRef.current < activityThreshold,
    consecutiveFailures: consecutiveFailuresRef.current
  };
}
