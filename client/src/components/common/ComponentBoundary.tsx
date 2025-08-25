import React, { Component, ReactNode } from 'react';
import { InlineError } from './InlineError';

interface ComponentBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ComponentBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ComponentBoundary - Local error isolation for risky components
 * 
 * Wraps components that might fail (modals, widgets) to prevent
 * page-level crashes. Shows InlineError with retry functionality.
 */
export class ComponentBoundary extends Component<ComponentBoundaryProps, ComponentBoundaryState> {
  constructor(props: ComponentBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ComponentBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ComponentBoundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      return (
        <InlineError
          title="Component Error"
          message="This component encountered an error and couldn't load."
          onRetry={this.retry}
          data-testid="component-boundary-error"
        />
      );
    }

    return this.props.children;
  }
}