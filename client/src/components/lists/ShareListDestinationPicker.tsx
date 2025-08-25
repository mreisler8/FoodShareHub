import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Globe, Lock, Eye, AlertTriangle } from "lucide-react";
import { CircleWithStats } from "@/lib/types";

export interface ShareDestination {
  type: "profile" | "circle" | "public" | "private";
  circleId?: number;
  circleName?: string;
}

interface ShareListDestinationPickerProps {
  selected?: ShareDestination;
  onChange: (destination: ShareDestination) => void;
  onContinue?: () => void;
  showContinueButton?: boolean;
}

export function ShareListDestinationPicker({ 
  selected, 
  onChange, 
  onContinue,
  showContinueButton = false 
}: ShareListDestinationPickerProps) {
  const [error, setError] = useState<string>("");

  // Fetch user's circles
  const { data: circles = [] } = useQuery<CircleWithStats[]>({
    queryKey: ["/api/circles"],
  });

  const handleDestinationChange = (type: ShareDestination["type"]) => {
    setError("");
    
    if (type === "circle") {
      // Don't set a destination yet, wait for circle selection
      return;
    }
    
    onChange({ type });
  };

  const handleCircleSelect = (circleId: string) => {
    const circle = circles.find(c => c.id === parseInt(circleId));
    if (circle) {
      onChange({
        type: "circle",
        circleId: circle.id,
        circleName: circle.name,
      });
      setError("");
    }
  };

  const handleContinue = () => {
    if (!selected?.type) {
      setError("Please choose where to share your list");
      return;
    }

    if (selected.type === "circle" && !selected.circleId) {
      setError("Please select a circle to share with");
      return;
    }

    if (onContinue) {
      onContinue();
    }
  };

  const getDestinationIcon = (type: string) => {
    switch (type) {
      case "profile": return <Eye className="h-5 w-5" />;
      case "circle": return <Users className="h-5 w-5" />;
      case "public": return <Globe className="h-5 w-5" />;
      case "private": return <Lock className="h-5 w-5" />;
      default: return null;
    }
  };

  const getDestinationDescription = (type: string) => {
    switch (type) {
      case "profile": 
        return "Visible on your profile to your followers";
      case "circle": 
        return "Only visible to members of the selected circle";
      case "public": 
        return "Anyone can discover and view this list";
      case "private": 
        return "Only you can see this list";
      default: 
        return "";
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Where would you like to share your list?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={selected?.type || ""}
          onValueChange={handleDestinationChange}
          className="space-y-4"
        >
          {/* Profile */}
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="profile" id="profile" />
            <Label htmlFor="profile" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                {getDestinationIcon("profile")}
                <div>
                  <div className="font-medium">Your Profile</div>
                  <div className="text-sm text-muted-foreground">
                    {getDestinationDescription("profile")}
                  </div>
                </div>
              </div>
            </Label>
          </div>

          {/* Circle */}
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="circle" id="circle" />
            <Label htmlFor="circle" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                {getDestinationIcon("circle")}
                <div>
                  <div className="font-medium">Share with Circle</div>
                  <div className="text-sm text-muted-foreground">
                    {getDestinationDescription("circle")}
                  </div>
                </div>
              </div>
            </Label>
          </div>

          {/* Circle Selection */}
          {selected?.type === "circle" && (
            <div className="ml-9 space-y-3">
              <Label className="text-sm font-medium">Select Circle</Label>
              {circles.length > 0 ? (
                <Select onValueChange={handleCircleSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a circle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {circles.map((circle) => (
                      <SelectItem key={circle.id} value={circle.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{circle.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({circle.memberCount} members)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You haven't joined any circles yet. 
                    <Button variant="link" className="p-0 h-auto ml-1">
                      Browse circles
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Public */}
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="public" id="public" />
            <Label htmlFor="public" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                {getDestinationIcon("public")}
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-sm text-muted-foreground">
                    {getDestinationDescription("public")}
                  </div>
                </div>
              </div>
            </Label>
          </div>

          {/* Private */}
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="private" id="private" />
            <Label htmlFor="private" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                {getDestinationIcon("private")}
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-sm text-muted-foreground">
                    {getDestinationDescription("private")}
                  </div>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Selected Destination Summary */}
        {selected?.type && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {getDestinationIcon(selected.type)}
                <div>
                  <div className="font-medium">
                    {selected.type === "circle" && selected.circleName
                      ? `Sharing with ${selected.circleName}`
                      : `Sharing to ${selected.type}`
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getDestinationDescription(selected.type)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Continue Button */}
        {showContinueButton && (
          <div className="flex justify-end">
            <Button 
              onClick={handleContinue}
              className="min-h-[48px] px-8"
              disabled={!selected?.type || (selected.type === "circle" && !selected.circleId)}
            >
              Continue to Preview
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}