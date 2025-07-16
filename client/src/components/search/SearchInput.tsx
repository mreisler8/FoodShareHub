import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  locationPermission?: 'granted' | 'denied' | 'prompt' | null;
  onLocationRequest?: () => void;
  showLocationButton?: boolean;
  disabled?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  isLoading = false,
  locationPermission,
  onLocationRequest,
  showLocationButton = true,
  disabled = false,
  className,
  inputRef,
  onKeyDown,
}: SearchInputProps) {
  const getLocationIcon = () => {
    switch (locationPermission) {
      case 'granted':
        return <Navigation className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <MapPin className="h-4 w-4 text-red-500" />;
      case 'prompt':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-400" />;
    }
  };

  const getLocationTooltip = () => {
    switch (locationPermission) {
      case 'granted':
        return 'Location enabled - showing nearby results';
      case 'denied':
        return 'Location access denied - showing general results';
      case 'prompt':
        return 'Getting location...';
      default:
        return 'Enable location for better results';
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2 z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className={cn(
          "pl-10",
          showLocationButton && "pr-12",
          isLoading && "pr-20"
        )}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {showLocationButton && onLocationRequest && !isLoading && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          onClick={onLocationRequest}
          title={getLocationTooltip()}
          disabled={disabled}
        >
          {getLocationIcon()}
        </Button>
      )}
    </div>
  );
}