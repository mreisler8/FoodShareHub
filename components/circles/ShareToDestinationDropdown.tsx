
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Globe, Users, Lock, AlertCircle } from "lucide-react";

interface Circle {
  id: string;
  name: string;
  memberCount: number;
  isPrivate: boolean;
}

interface ShareDestination {
  visibility: "profile" | "public" | "circle";
  circleId?: string;
}

interface Props {
  value: ShareDestination;
  onChange: (val: ShareDestination) => void;
  disabled?: boolean;
}

export function ShareToDestinationDropdown({ value, onChange, disabled = false }: Props) {
  const [error, setError] = useState<string | null>(null);

  const { data: circles = [], isLoading, error: queryError } = useQuery<Circle[]>({
    queryKey: ["/api/circles/mine"],
    queryFn: async () => {
      const response = await fetch("/api/circles/mine");
      if (!response.ok) {
        throw new Error("Failed to fetch your circles");
      }
      return response.json();
    },
    staleTime: 60000, // Cache for 1 minute
    retry: 2,
  });

  useEffect(() => {
    if (queryError) {
      setError("Unable to load your circles. You can still share to your profile or publicly.");
    } else {
      setError(null);
    }
  }, [queryError]);

  const handleValueChange = (selectedValue: string) => {
    setError(null);
    
    if (selectedValue === "profile") {
      onChange({ visibility: "profile" });
    } else if (selectedValue === "public") {
      onChange({ visibility: "public" });
    } else {
      // It's a circle ID
      const selectedCircle = circles.find(c => c.id === selectedValue);
      if (selectedCircle) {
        onChange({ visibility: "circle", circleId: selectedValue });
      }
    }
  };

  const getCurrentValue = (): string => {
    if (value.visibility === "circle" && value.circleId) {
      return value.circleId;
    }
    return value.visibility;
  };

  const getDisplayText = (option: string): React.ReactNode => {
    switch (option) {
      case "profile":
        return (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span>Your Profile</span>
            <Badge variant="outline" className="text-xs">Private</Badge>
          </div>
        );
      case "public":
        return (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>Public Feed</span>
            <Badge variant="outline" className="text-xs">Everyone</Badge>
          </div>
        );
      default:
        const circle = circles.find(c => c.id === option);
        if (circle) {
          return (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{circle.name}</span>
              <Badge variant="outline" className="text-xs">
                {circle.memberCount} members
              </Badge>
              {circle.isPrivate && (
                <Badge variant="secondary" className="text-xs">Private</Badge>
              )}
            </div>
          );
        }
        return option;
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Share this list to:
        <span className="text-muted-foreground ml-1">(Choose your audience)</span>
      </label>

      <Select
        value={getCurrentValue()}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {getDisplayText(getCurrentValue())}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="profile">
            <div className="flex items-center gap-2 w-full">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Your Profile</div>
                <div className="text-xs text-muted-foreground">Only visible to you</div>
              </div>
              <Badge variant="outline" className="text-xs">Private</Badge>
            </div>
          </SelectItem>
          
          <SelectItem value="public">
            <div className="flex items-center gap-2 w-full">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Public Feed</div>
                <div className="text-xs text-muted-foreground">Visible to everyone</div>
              </div>
              <Badge variant="outline" className="text-xs">Everyone</Badge>
            </div>
          </SelectItem>

          {isLoading && (
            <div className="flex items-center justify-center p-2">
              <LoadingSpinner className="h-4 w-4 mr-2" />
              <span className="text-sm text-muted-foreground">Loading circles...</span>
            </div>
          )}

          {circles.map((circle) => (
            <SelectItem key={circle.id} value={circle.id}>
              <div className="flex items-center gap-2 w-full">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{circle.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {circle.memberCount} member{circle.memberCount !== 1 ? 's' : ''}
                  </div>
                </div>
                {circle.isPrivate && (
                  <Badge variant="secondary" className="text-xs">Private</Badge>
                )}
              </div>
            </SelectItem>
          ))}

          {circles.length === 0 && !isLoading && !error && (
            <div className="p-2 text-center text-sm text-muted-foreground">
              No circles yet. Create one to share with specific groups!
            </div>
          )}
        </SelectContent>
      </Select>

      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Profile:</strong> Only you can see this list</p>
        <p><strong>Public:</strong> Anyone can discover and view this list</p>
        <p><strong>Circle:</strong> Only members of the selected circle can see this list</p>
      </div>
    </div>
  );
}
