import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  title?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * SectionBoundary - Universal error boundary for restaurant page widgets
 * 
 * Designed for surgical error isolation without breaking the entire page.
 * Each async widget should be wrapped to prevent cascading failures.
 */
export class SectionBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Client telemetry integration point
    if (typeof window !== 'undefined' && (window as any).trackError) {
      (window as any).trackError('section_boundary_error', {
        message: error.message,
        section: this.props.title || 'unknown',
        stack: error.stack
      });
    }

    console.error(`SectionBoundary [${this.props.title || 'Unknown'}]:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default inline error fallback - minimal and non-disruptive
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">
                {this.props.title ? `${this.props.title} temporarily unavailable` : 'Section temporarily unavailable'}
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <p className="text-xs text-red-600 mt-1 font-mono truncate">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleRetry}
              className="border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0"
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}