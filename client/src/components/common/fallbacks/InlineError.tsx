import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * InlineError - Standardized error fallback for failed widget sections
 * 
 * Provides consistent error messaging without breaking page flow.
 * Used by SectionBoundary and individual error states.
 */
export function InlineError({ 
  title = "Unable to load", 
  message = "Something went wrong loading this section",
  onRetry,
  className = ""
}: InlineErrorProps) {
  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`} role="alert">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-red-800 mb-2">{title}</h3>
        <p className="text-sm text-red-600 mb-4">{message}</p>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="border-red-300 text-red-700 hover:bg-red-100 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}