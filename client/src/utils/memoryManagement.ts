/**
 * Memory Management Utilities for React Components
 * Implements comprehensive memory leak prevention and cleanup
 */

export class MemoryManager {
  private static instance: MemoryManager;
  private eventListeners: Map<string, { element: EventTarget; event: string; handler: EventListener }[]> = new Map();
  private timers: Map<string, NodeJS.Timeout[]> = new Map();
  private intervals: Map<string, NodeJS.Timeout[]> = new Map();
  private observationTargets: Map<string, { observer: any; target: Element }[]> = new Map();

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // Event listener management
  addEventListener(componentId: string, element: EventTarget, event: string, handler: EventListener, options?: boolean | AddEventListenerOptions) {
    element.addEventListener(event, handler, options);

    if (!this.eventListeners.has(componentId)) {
      this.eventListeners.set(componentId, []);
    }

    this.eventListeners.get(componentId)!.push({ element, event, handler });
  }

  // Timer management
  setTimeout(componentId: string, callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(callback, delay);

    if (!this.timers.has(componentId)) {
      this.timers.set(componentId, []);
    }

    this.timers.get(componentId)!.push(timer);
    return timer;
  }

  setInterval(componentId: string, callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);

    if (!this.intervals.has(componentId)) {
      this.intervals.set(componentId, []);
    }

    this.intervals.get(componentId)!.push(interval);
    return interval;
  }

  // Observer management (IntersectionObserver, MutationObserver, etc.)
  addObserver(componentId: string, observer: any, target: Element) {
    if (!this.observationTargets.has(componentId)) {
      this.observationTargets.set(componentId, []);
    }

    this.observationTargets.get(componentId)!.push({ observer, target });
  }

  // Cleanup all resources for a component
  cleanup(componentId: string) {
    // Clean up event listeners
    const listeners = this.eventListeners.get(componentId);
    if (listeners) {
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.eventListeners.delete(componentId);
    }

    // Clean up timers
    const timers = this.timers.get(componentId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.timers.delete(componentId);
    }

    // Clean up intervals
    const intervals = this.intervals.get(componentId);
    if (intervals) {
      intervals.forEach(interval => clearInterval(interval));
      this.intervals.delete(componentId);
    }

    // Clean up observers
    const observers = this.observationTargets.get(componentId);
    if (observers) {
      observers.forEach(({ observer, target }) => {
        if (observer.disconnect) {
          observer.disconnect();
        } else if (observer.unobserve && target) {
          observer.unobserve(target);
        }
      });
      this.observationTargets.delete(componentId);
    }

    console.log(`MemoryManager: Cleaned up resources for component ${componentId}`);
  }

  // Get memory statistics
  getStats() {
    const eventListenerKeys = Array.from(this.eventListeners.keys());
    const timerKeys = Array.from(this.timers.keys());
    const intervalKeys = Array.from(this.intervals.keys());
    const observerKeys = Array.from(this.observationTargets.keys());

    return {
      eventListeners: eventListenerKeys.length,
      timers: timerKeys.length,
      intervals: intervalKeys.length,
      observers: observerKeys.length,
      totalComponents: new Set([
        ...eventListenerKeys,
        ...timerKeys,
        ...intervalKeys,
        ...observerKeys
      ]).size
    };
  }

  // Force cleanup of all resources (for emergency situations)
  forceCleanupAll() {
    const eventListenerKeys = Array.from(this.eventListeners.keys());
    const timerKeys = Array.from(this.timers.keys());
    const intervalKeys = Array.from(this.intervals.keys());
    const observerKeys = Array.from(this.observationTargets.keys());

    const allComponentIds = new Set([
      ...eventListenerKeys,
      ...timerKeys,
      ...intervalKeys,
      ...observerKeys
    ]);

    allComponentIds.forEach(componentId => {
      this.cleanup(componentId);
    });

    console.warn('MemoryManager: Force cleanup of all resources completed');
  }
}

// React Hook for memory management
import { useEffect, useRef } from 'react';

export function useMemoryManagement(componentName: string) {
  const memoryManager = MemoryManager.getInstance();
  const componentId = useRef(`${componentName}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      memoryManager.cleanup(componentId.current);
    };
  }, [memoryManager]);

  return {
    componentId: componentId.current,
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener, options?: boolean | AddEventListenerOptions) => {
      memoryManager.addEventListener(componentId.current, element, event, handler, options);
    },
    setTimeoutSafe: (callback: () => void, delay: number) => {
      return memoryManager.setTimeout(componentId.current, callback, delay);
    },
    setIntervalSafe: (callback: () => void, delay: number) => {
      return memoryManager.setInterval(componentId.current, callback, delay);
    },
    addObserverSafe: (observer: any, target: Element) => {
      memoryManager.addObserver(componentId.current, observer, target);
    }
  };
}

// Memory monitoring utilities
export function getMemoryUsage() {
  const perf = performance as any;
  if (perf.memory) {
    return {
      usedJSMemory: Math.round(perf.memory.usedJSMemory / 1024 / 1024),
      totalJSMemory: Math.round(perf.memory.totalJSMemory / 1024 / 1024),
      jsMemoryLimit: Math.round(perf.memory.jsMemoryLimit / 1024 / 1024),
    };
  }
  return null;
}

export function logMemoryUsage(context: string) {
  const memory = getMemoryUsage();
  if (memory) {
    console.log(`[Memory - ${context}] Used: ${memory.usedJSMemory}MB, Total: ${memory.totalJSMemory}MB, Limit: ${memory.jsMemoryLimit}MB`);
  }
}

// Debug utilities for development
export function enableMemoryDebugging() {
  if (process.env.NODE_ENV === 'development') {
    const memoryManager = MemoryManager.getInstance();

    // Log memory stats every 30 seconds
    setInterval(() => {
      const stats = memoryManager.getStats();
      const memory = getMemoryUsage();

      console.log('Memory Debug Stats:', {
        memoryManager: stats,
        browserMemory: memory
      });
    }, 30000);

    // Log memory on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        logMemoryUsage('Page Visible');
      }
    });
  }
}

export const formatMemorySize = (bytes: number | null): string => {
  if (bytes === null || bytes === undefined || isNaN(bytes)) {
    return '0.00';
  }
  return (bytes / 1024 / 1024).toFixed(2);
};