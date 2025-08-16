import React, { Component, ReactNode } from 'react';
import { InlineError } from '@/components/common/InlineError';

interface ListsErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  showNAData?: boolean;
}

interface ListsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lists Error Boundary - Specialized error isolation for list functionality
 * 
 * Implements user preferences:
 * - Shows N/A data with error indicators when showNAData=true
 * - Provides robust error handling for future reliability
 * - Maintains properly architected dependency chain with error boundaries
 */
export class ListsErrorBoundary extends Component<ListsErrorBoundaryProps, ListsErrorBoundaryState> {
  constructor(props: ListsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ListsErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Lists functionality error:', error, errorInfo);
    
    // Track specific list-related errors for debugging
    if (error.message.includes('useRestaurantCache')) {
      console.warn('Restaurant cache dependency error in lists - showing N/A data');
    } else if (error.message.includes('CircleScore')) {
      console.warn('Circle score dependency error in lists - degrading gracefully');
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      // Default fallback with N/A data option
      if (this.props.showNAData) {
        return (
          <div className="space-y-4">
            <InlineError
              title="Lists partially available"
              message="Some features may show N/A data due to service connectivity. Core list functionality remains available."
              onRetry={this.retry}
              data-testid="lists-error-boundary"
            />
            {/* Render children in degraded mode - they should handle missing data gracefully */}
            <div className="opacity-75">
              {this.props.children}
            </div>
          </div>
        );
      }

      // Standard error fallback
      return (
        <InlineError
          title="Lists temporarily unavailable"
          message="Unable to load list functionality. Please try refreshing the page."
          onRetry={this.retry}
          data-testid="lists-error-boundary"
        />
      );
    }

    return this.props.children;
  }
}