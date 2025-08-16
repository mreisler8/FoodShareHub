import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InlineErrorProps = {
  title?: string;
  message: string | React.ReactNode;
  actionLabel?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
};

export function InlineError({
  title = 'Something went wrong',
  message,
  actionLabel = 'Retry',
  onRetry,
  icon,
  className,
  ...rest
}: InlineErrorProps) {
  return (
    <div role="alert" className={cn('rounded-md border border-red-200 bg-red-50 p-4', className)} {...rest}>
      <div className="flex items-start gap-3">
        {icon ?? <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" aria-hidden />}
        <div className="flex-1 space-y-1">
          {title && <h4 className="text-sm font-semibold text-red-800">{title}</h4>}
          <div className="text-sm text-red-700">{message}</div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              aria-label={`${actionLabel}: retry last action`}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}