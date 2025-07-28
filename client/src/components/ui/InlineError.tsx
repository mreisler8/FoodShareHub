import { Button } from './button';

interface InlineErrorProps {
  error?: Error | string | null;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function InlineError({ 
  error, 
  message = "Couldn't load content.", 
  onRetry, 
  retryLabel = "Try Again" 
}: InlineErrorProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : (error?.message || message);

  return (
    <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded mb-4">
      <p className="text-sm">{errorMessage}</p>
      {onRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          className="mt-2 text-red-800 border-red-300 hover:bg-red-50 min-h-[44px]"
          size="sm"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}