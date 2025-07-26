import { useCallback, useRef } from 'react';

interface MemoryManager {
  trackComponent: (componentName: string) => void;
  cleanupComponent: (componentName: string) => void;
  getActiveComponents: () => string[];
}

export function useMemoryManagement(): MemoryManager {
  const activeComponents = useRef<Set<string>>(new Set());

  const trackComponent = useCallback((componentName: string) => {
    activeComponents.current.add(componentName);
    
    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Tracking component: ${componentName}`);
    }
  }, []);

  const cleanupComponent = useCallback((componentName: string) => {
    activeComponents.current.delete(componentName);
    
    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Cleaned up component: ${componentName}`);
    }
  }, []);

  const getActiveComponents = useCallback(() => {
    return Array.from(activeComponents.current);
  }, []);

  return {
    trackComponent,
    cleanupComponent,
    getActiveComponents,
  };
}