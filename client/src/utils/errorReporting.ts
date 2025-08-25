
export interface ErrorReport {
  type: 'javascript' | 'promise_rejection' | 'component' | 'api' | 'network';
  message: string;
  stack?: string;
  url?: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  context?: Record<string, any>;
}

class ErrorReporter {
  private errors: ErrorReport[] = [];
  private maxErrors = 100; // Prevent memory leaks

  report(error: Partial<ErrorReport>) {
    const errorReport: ErrorReport = {
      type: 'javascript',
      message: 'Unknown error',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...error
    };

    // Add to local storage for debugging
    this.errors.push(errorReport);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log for development
    if (import.meta.env.DEV) {
      console.error('Error Report:', errorReport);
    }

    // Send to analytics in production
    if (import.meta.env.PROD) {
      this.sendToAnalytics(errorReport);
    }
  }

  private sendToAnalytics(error: ErrorReport) {
    // Implement your analytics service here
    // For now, just log
    console.error('Production Error:', error);
    
    // Example: Send to external service
    // fetch('/api/analytics/error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(error)
    // }).catch(() => {
    //   // Silently fail analytics
    // });
  }

  getRecentErrors(): ErrorReport[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

export const errorReporter = new ErrorReporter();

// Make available globally for debugging
if (import.meta.env.DEV) {
  (window as any).errorReporter = errorReporter;
}
