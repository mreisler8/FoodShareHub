import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Globe, Lock, Eye } from "lucide-react";
import { CircleWithStats } from "@/lib/types";

export interface ShareDestination {
  type: "profile" | "circle" | "public" | "private";
  circleId?: number;
  circleName?: string;
}

interface ShareDestinationCardsProps {
  selected: ShareDestination;
  onChange: (destination: ShareDestination) => void;
}

export function ShareDestinationCards({ selected, onChange }: ShareDestinationCardsProps) {
  // Fetch user's circles
  const { data: circles = [] } = useQuery<CircleWithStats[]>({
    queryKey: ["/api/circles"],
  });

  const handleTypeChange = (type: ShareDestination["type"]) => {
    if (type === "circle" && circles.length > 0) {
      // Default to first circle if none selected
      const firstCircle = circles[0];
      onChange({
        type: "circle",
        circleId: firstCircle.id,
        circleName: firstCircle.name,
      });
    } else {
      onChange({ type });
    }
  };

  const handleCircleSelect = (circleId: string) => {
    const circle = circles.find(c => c.id === parseInt(circleId));
    if (circle) {
      onChange({
        type: "circle",
        circleId: circle.id,
        circleName: circle.name,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-3">
        🎯 Where should this list appear?
      </div>
      
      <RadioGroup
        value={selected.type}
        onValueChange={handleTypeChange}
        className="grid grid-cols-1 gap-3"
      >
        {/* Keep Private */}
        <div>
          <RadioGroupItem value="private" id="private" className="peer sr-only" />
          <Label
            htmlFor="private"
            className="flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-3 hover:bg-gray-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Lock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="font-medium">🔒 Keep Private</div>
                <div className="text-sm text-gray-500">Only you can see this list</div>
              </div>
            </div>
          </Label>
        </div>

        {/* My Profile */}
        <div>
          <RadioGroupItem value="profile" id="profile" className="peer sr-only" />
          <Label
            htmlFor="profile"
            className="flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-3 hover:bg-gray-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">👤 My Profile</div>
                <div className="text-sm text-gray-500">Your followers can see this</div>
              </div>
            </div>
          </Label>
        </div>

        {/* Share with Circle */}
        {circles.length > 0 && (
          <div>
            <RadioGroupItem value="circle" id="circle" className="peer sr-only" />
            <Label
              htmlFor="circle"
              className="flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-3 hover:bg-gray-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">🫶 A Circle</div>
                  <div className="text-sm text-gray-500">Share with a trusted group</div>
                  {selected.type === "circle" && (
                    <div className="mt-2">
                      <Select
                        value={selected.circleId?.toString() || ""}
                        onValueChange={handleCircleSelect}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a circle..." />
                        </SelectTrigger>
                        <SelectContent>
                          {circles.map((circle) => (
                            <SelectItem key={circle.id} value={circle.id.toString()}>
                              {circle.name} ({circle.memberCount} members)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </Label>
          </div>
        )}

        {/* Public Feed */}
        <div>
          <RadioGroupItem value="public" id="public" className="peer sr-only" />
          <Label
            htmlFor="public"
            className="flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-3 hover:bg-gray-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">🌍 Public Feed</div>
                <div className="text-sm text-gray-500">Everyone can discover this</div>
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}