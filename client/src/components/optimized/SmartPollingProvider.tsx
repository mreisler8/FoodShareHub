import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSearchCache } from '@/hooks/useSearchCache';
import { useMemoryManagement, enableMemoryDebugging } from '@/utils/memoryManagement';

interface SmartPollingContextType {
  searchCache: ReturnType<typeof useSearchCache>;
  memoryManager: ReturnType<typeof useMemoryManagement>;
}

const SmartPollingContext = createContext<SmartPollingContextType | null>(null);

export function SmartPollingProvider({ children }: { children: React.ReactNode }) {
  const [pollingInterval, setPollingInterval] = useState(60000); // Start with 60 seconds (reduced from 30)
  const [isUserActive, setIsUserActive] = useState(true);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const handleActivity = () => {
      setIsUserActive(true);
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Check for inactivity every 2 minutes (reduced frequency)
    const activityCheck = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const isActive = timeSinceActivity < 120000; // 2 minute threshold (increased)

      setIsUserActive(isActive);

      // More aggressive polling reduction
      if (isActive) {
        setPollingInterval(60000); // 60 seconds for active users (reduced from 30)
      } else {
        setPollingInterval(Math.min(600000, pollingInterval * 2)); // Max 10 minutes, faster exponential backoff
      }
    }, 120000); // Check every 2 minutes instead of 1

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(activityCheck);
    };
  }, [pollingInterval]);

  const searchCache = useSearchCache({
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100
  });

  const memoryManager = useMemoryManagement('SmartPollingProvider');
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      // Enable memory debugging in development
      if (process.env.NODE_ENV === 'development') {
        enableMemoryDebugging();
        console.log('SmartPollingProvider: Memory debugging enabled');
      }

      // Setup global performance monitoring
      if (typeof window !== 'undefined') {
        const reportWebVitals = (metric: any) => {
          if (metric.name === 'CLS' && metric.value > 0.1) {
            console.warn('High Cumulative Layout Shift detected:', metric.value);
          }
          if (metric.name === 'FID' && metric.value > 100) {
            console.warn('High First Input Delay detected:', metric.value);
          }
          if (metric.name === 'LCP' && metric.value > 2500) {
            console.warn('High Largest Contentful Paint detected:', metric.value);
          }
        };

        // Use Web Vitals if available
        if ('web-vitals' in window) {
          const webVitals = (window as any)['web-vitals'];
          webVitals.getCLS(reportWebVitals);
          webVitals.getFID(reportWebVitals);
          webVitals.getLCP(reportWebVitals);
        }
      }

      isInitialized.current = true;
    }
  }, []);

  const contextValue: SmartPollingContextType = {
    searchCache,
    memoryManager
  };

  return (
    <SmartPollingContext.Provider value={contextValue}>
      {children}
    </SmartPollingContext.Provider>
  );
}

export function useSmartPollingContext() {
  const context = useContext(SmartPollingContext);
  if (!context) {
    throw new Error('useSmartPollingContext must be used within SmartPollingProvider');
  }
  return context;
}

// Higher-order component for automatic memory management
export function withMemoryManagement<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const memoryManager = useMemoryManagement(componentName);

    return <Component ref={ref} {...props} />;
  });

  WrappedComponent.displayName = `withMemoryManagement(${componentName})`;
  return WrappedComponent;
}