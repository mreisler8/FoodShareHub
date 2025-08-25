import React from 'react';
import './ModernShimmerLoader.css';

interface ModernShimmerLoaderProps {
  viewMode?: 'list' | 'grid' | 'masonry';
  count?: number;
}

export function ModernShimmerLoader({ viewMode = 'list', count = 3 }: ModernShimmerLoaderProps) {
  const getShimmerClasses = () => {
    const baseClasses = "modern-shimmer-card";
    const modeClasses = {
      list: "modern-shimmer-card--list",
      grid: "modern-shimmer-card--grid", 
      masonry: "modern-shimmer-card--masonry"
    };
    return `${baseClasses} ${modeClasses[viewMode]}`;
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={getShimmerClasses()}>
          {/* Header shimmer */}
          <div className="modern-shimmer-header">
            <div className="modern-shimmer-avatar"></div>
            <div className="modern-shimmer-author-info">
              <div className="modern-shimmer-name"></div>
              <div className="modern-shimmer-time"></div>
            </div>
          </div>

          {/* Image shimmer - varies by view mode */}
          <div className={`modern-shimmer-image modern-shimmer-image--${viewMode}`}>
            <div className="modern-shimmer-overlay"></div>
          </div>

          {/* Content shimmer */}
          <div className="modern-shimmer-content">
            <div className="modern-shimmer-text-line modern-shimmer-text-line--full"></div>
            <div className="modern-shimmer-text-line modern-shimmer-text-line--partial"></div>
          </div>

          {/* Actions shimmer */}
          <div className="modern-shimmer-actions">
            <div className="modern-shimmer-action-button"></div>
            <div className="modern-shimmer-action-button"></div>
            <div className="modern-shimmer-action-button"></div>
            <div className="modern-shimmer-action-spacer"></div>
            <div className="modern-shimmer-action-button"></div>
          </div>
        </div>
      ))}
    </>
  );
}

// Premium Stories Shimmer Loader
export function StoriesShimmerLoader({ count = 8 }: { count?: number }) {
  return (
    <div className="stories-shimmer-container">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="story-shimmer-item">
          <div className="story-shimmer-ring">
            <div className="story-shimmer-avatar"></div>
          </div>
          <div className="story-shimmer-username"></div>
        </div>
      ))}
    </div>
  );
}

// Enhanced Loading States for Different Content Types
export function FeedLoadingState({ viewMode }: { viewMode: 'list' | 'grid' | 'masonry' }) {
  const getContainerClasses = () => {
    switch (viewMode) {
      case 'grid':
        return 'grid grid-cols-2 md:grid-cols-3 gap-4';
      case 'masonry':
        return 'columns-2 md:columns-3 gap-4';
      default:
        return 'space-y-6';
    }
  };

  return (
    <div className={`feed-loading-container ${getContainerClasses()}`}>
      <ModernShimmerLoader viewMode={viewMode} count={viewMode === 'grid' ? 6 : 3} />
    </div>
  );
}