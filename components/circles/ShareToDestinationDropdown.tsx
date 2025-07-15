
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Globe, Lock, Users, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Circle } from "@shared/schema";

interface ShareDestination {
  visibility: 'private' | 'public' | 'circle';
  circleId?: number;
  circleIds?: number[];
}

interface Props {
  value: ShareDestination;
  onChange: (destination: ShareDestination) => void;
  disabled?: boolean;
  className?: string;
}

export function ShareToDestinationDropdown({ value, onChange, disabled = false, className }: Props) {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch user's circles with proper error handling
  const { 
    data: circles = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/circles'],
    queryFn: async () => {
      const response = await fetch('/api/circles');
      if (!response.ok) {
        throw new Error(`Failed to load circles: ${response.status}`);
      }
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Validate selection
  useEffect(() => {
    setValidationError(null);
    
    if (value.visibility === 'circle' && value.circleId) {
      const selectedCircle = circles.find((c: Circle) => c.id === value.circleId);
      if (!selectedCircle) {
        setValidationError('Selected circle is no longer available');
      } else if (selectedCircle.isPrivate && !selectedCircle.creatorId) {
        setValidationError('You do not have permission to share to this circle');
      }
    }
  }, [value, circles]);

  const handleDestinationChange = (destination: string) => {
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('List Share Destination Changed', {
        from: value.visibility,
        to: destination,
        hasCircles: circles.length > 0,
      });
    }

    if (destination === 'private') {
      onChange({ visibility: 'private' });
    } else if (destination === 'public') {
      onChange({ visibility: 'public' });
    } else {
      // Handle circle selection
      const circleId = parseInt(destination);
      if (!isNaN(circleId)) {
        onChange({ 
          visibility: 'circle', 
          circleId: circleId 
        });
      }
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private': return <Lock className="h-4 w-4" />;
      case 'public': return <Globe className="h-4 w-4" />;
      case 'circle': return <Users className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getVisibilityDescription = () => {
    switch (value.visibility) {
      case 'private':
        return 'Only you can see this list on your profile';
      case 'public':
        return 'Anyone can discover this list in public feeds';
      case 'circle':
        const circle = circles.find((c: Circle) => c.id === value.circleId);
        return circle 
          ? `Only members of "${circle.name}" can see this list`
          : 'Shared with selected circle members only';
      default:
        return '';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load your circles. 
          <button 
            onClick={() => refetch()} 
            className="ml-2 underline hover:no-underline"
          >
            Try again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-sm font-medium text-gray-900">
        Share this list to:
      </Label>
      
      <Select
        value={value.circleId?.toString() || value.visibility}
        onValueChange={handleDestinationChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            {getVisibilityIcon(value.visibility)}
            <SelectValue placeholder="Choose where to share..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="private">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>Your Profile</span>
              <Badge variant="secondary" className="ml-auto">Private</Badge>
            </div>
          </SelectItem>
          
          <SelectItem value="public">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Public Feed</span>
              <Badge variant="outline" className="ml-auto">Public</Badge>
            </div>
          </SelectItem>
          
          {circles.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs text-gray-500 border-t mt-1 pt-2">
                Your Circles
              </div>
              {circles.map((circle: Circle) => (
                <SelectItem key={circle.id} value={circle.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{circle.name}</span>
                    <div className="ml-auto flex items-center gap-1">
                      {circle.isPrivate && <Lock className="h-3 w-3" />}
                      <Badge variant="secondary" className="text-xs">
                        {circle.memberCount} members
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          
          {isLoading && (
            <div className="px-2 py-2 text-xs text-gray-500">
              Loading your circles...
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Visibility description */}
      <p className="text-xs text-gray-600 flex items-start gap-2">
        {getVisibilityIcon(value.visibility)}
        {getVisibilityDescription()}
      </p>

      {/* Validation error */}
      {validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {validationError}
          </AlertDescription>
        </Alert>
      )}

      {/* Privacy notice for enterprise compliance */}
      {value.visibility === 'public' && (
        <Alert className="py-2">
          <Globe className="h-4 w-4" />
          <AlertDescription className="text-sm">
            This list will be discoverable by anyone and may appear in search results.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
