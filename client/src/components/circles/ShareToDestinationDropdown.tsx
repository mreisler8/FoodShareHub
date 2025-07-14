import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Globe, User, Lock } from "lucide-react";

interface Circle {
  id: number;
  name: string;
  isPrivate: boolean;
  memberCount: number;
}

interface ShareToDestinationDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onCircleChange?: (circleId: number | null) => void;
  className?: string;
}

export function ShareToDestinationDropdown({ 
  value, 
  onChange, 
  onCircleChange,
  className 
}: ShareToDestinationDropdownProps) {
  const { data: circles = [] } = useQuery<Circle[]>({
    queryKey: ["/api/circles"],
  });

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
    
    if (newValue.startsWith("circle-")) {
      const circleId = parseInt(newValue.replace("circle-", ""));
      onCircleChange?.(circleId);
    } else {
      onCircleChange?.(null);
    }
  };

  const getDisplayValue = () => {
    if (value === "profile") return "Profile (My followers)";
    if (value === "public") return "Public Feed";
    if (value.startsWith("circle-")) {
      const circleId = parseInt(value.replace("circle-", ""));
      const circle = circles.find(c => c.id === circleId);
      return circle ? `Circle: ${circle.name}` : "Select destination";
    }
    return "Select destination";
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select destination">
          {getDisplayValue()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="profile">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
            <Badge variant="outline" className="ml-auto">
              My followers
            </Badge>
          </div>
        </SelectItem>
        
        <SelectItem value="public">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Public Feed</span>
            <Badge variant="outline" className="ml-auto">
              Everyone
            </Badge>
          </div>
        </SelectItem>
        
        {circles.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
              My Circles
            </div>
            {circles.map(circle => (
              <SelectItem key={circle.id} value={`circle-${circle.id}`}>
                <div className="flex items-center gap-2 w-full">
                  <Users className="h-4 w-4" />
                  <span className="flex-1">{circle.name}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    {circle.isPrivate && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {circle.memberCount} members
                    </Badge>
                  </div>
                </div>
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}