
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to analytics or error reporting service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6" data-testid="error-boundary">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-4">
              <div data-testid="error-boundary-message">
                Something went wrong. Please try refreshing the page.
              </div>
              {this.state.error && (
                <details className="mt-2 text-xs" open>
                  <summary className="cursor-pointer">🔍 Error Details (Debug Mode)</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-red-600 text-[10px] max-h-40 overflow-auto">
                    <strong>Error:</strong> {this.state.error.toString()}
                    <strong>Stack:</strong> {this.state.error.stack}
                    <strong>Component Stack:</strong> {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <Button
                size="sm"
                onClick={this.handleRetry}
                className="mt-3"
                data-testid="error-boundary-retry"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
