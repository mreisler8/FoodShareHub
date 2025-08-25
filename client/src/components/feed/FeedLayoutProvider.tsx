import React, { createContext, useContext, useState, ReactNode } from 'react';

export type FeedViewMode = 'list' | 'grid' | 'masonry' | 'stories';

interface FeedLayoutContextType {
  viewMode: FeedViewMode;
  setViewMode: (mode: FeedViewMode) => void;
  isCompactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  enableInfiniteScroll: boolean;
  setEnableInfiniteScroll: (enable: boolean) => void;
}

const FeedLayoutContext = createContext<FeedLayoutContextType | undefined>(undefined);

interface FeedLayoutProviderProps {
  children: ReactNode;
  defaultViewMode?: FeedViewMode;
}

export function FeedLayoutProvider({ children, defaultViewMode = 'list' }: FeedLayoutProviderProps) {
  const [viewMode, setViewMode] = useState<FeedViewMode>(defaultViewMode);
  const [isCompactMode, setCompactMode] = useState(false);
  const [enableInfiniteScroll, setEnableInfiniteScroll] = useState(true);

  const value = {
    viewMode,
    setViewMode,
    isCompactMode,
    setCompactMode,
    enableInfiniteScroll,
    setEnableInfiniteScroll,
  };

  return (
    <FeedLayoutContext.Provider value={value}>
      {children}
    </FeedLayoutContext.Provider>
  );
}

export function useFeedLayout() {
  const context = useContext(FeedLayoutContext);
  if (context === undefined) {
    throw new Error('useFeedLayout must be used within a FeedLayoutProvider');
  }
  return context;
}

export function getFeedLayoutClasses(viewMode: FeedViewMode): string {
  switch (viewMode) {
    case 'list':
      return 'feed-layout-list space-y-6';
    case 'grid':
      return 'feed-layout-grid grid grid-cols-2 md:grid-cols-3 gap-4';
    case 'masonry':
      return 'feed-layout-masonry columns-2 md:columns-3 gap-4 space-y-4';
    case 'stories':
      return 'feed-layout-stories';
    default:
      return 'feed-layout-list space-y-6';
  }
}