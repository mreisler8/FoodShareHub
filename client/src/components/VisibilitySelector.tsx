import { useState } from 'react';
import { Globe, Users, UserCheck, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface VisibilitySettings {
  public: boolean;
  followers: boolean;
  circleIds: number[];
}

interface VisibilitySelectorProps {
  value: VisibilitySettings;
  onChange: (visibility: VisibilitySettings) => void;
  className?: string;
}

interface Circle {
  id: number;
  name: string;
  description?: string;
}

export function VisibilitySelector({ value, onChange, className = '' }: VisibilitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: circles = [] } = useQuery<Circle[]>({
    queryKey: ['/api/circles'],
    queryFn: () => apiRequest('/api/circles'),
  });

  const handlePublicChange = (checked: boolean) => {
    onChange({
      ...value,
      public: checked,
      // If making public, disable followers and circles
      followers: checked ? false : value.followers,
      circleIds: checked ? [] : value.circleIds,
    });
  };

  const handleFollowersChange = (checked: boolean) => {
    onChange({
      ...value,
      followers: checked,
      // If enabling followers, disable public
      public: checked ? false : value.public,
    });
  };

  const handleCircleToggle = (circleId: number, checked: boolean) => {
    const newCircleIds = checked
      ? [...value.circleIds, circleId]
      : value.circleIds.filter(id => id !== circleId);
    
    onChange({
      ...value,
      circleIds: newCircleIds,
      // If selecting circles, disable public
      public: newCircleIds.length > 0 ? false : value.public,
    });
  };

  const getVisibilityText = () => {
    const parts = [];
    
    if (value.public) {
      parts.push('Public');
    }
    
    if (value.followers) {
      parts.push('Followers');
    }
    
    if (value.circleIds.length > 0) {
      const selectedCircles = circles.filter(circle => value.circleIds.includes(circle.id));
      if (selectedCircles.length === 1) {
        parts.push(selectedCircles[0].name);
      } else if (selectedCircles.length > 1) {
        parts.push(`${selectedCircles.length} circles`);
      }
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Select visibility';
  };

  const getVisibilityIcon = () => {
    if (value.public) return <Globe className="h-4 w-4" />;
    if (value.followers) return <UserCheck className="h-4 w-4" />;
    if (value.circleIds.length > 0) return <Users className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>Visibility</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2">
              {getVisibilityIcon()}
              <span>{getVisibilityText()}</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="public"
                  checked={value.public}
                  onCheckedChange={handlePublicChange}
                />
                <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                  <Globe className="h-4 w-4" />
                  Public
                </Label>
              </div>
              <p className="text-sm text-gray-500 ml-6">
                Anyone can see this content
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="followers"
                  checked={value.followers}
                  onCheckedChange={handleFollowersChange}
                />
                <Label htmlFor="followers" className="flex items-center gap-2 cursor-pointer">
                  <UserCheck className="h-4 w-4" />
                  Followers
                </Label>
              </div>
              <p className="text-sm text-gray-500 ml-6">
                Only people who follow you can see this
              </p>
            </div>

            {circles.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Circles
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {circles.map((circle) => (
                    <div key={circle.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`circle-${circle.id}`}
                        checked={value.circleIds.includes(circle.id)}
                        onCheckedChange={(checked) => 
                          handleCircleToggle(circle.id, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={`circle-${circle.id}`} 
                        className="cursor-pointer text-sm"
                      >
                        {circle.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Share with specific circles
                </p>
              </div>
            )}

            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}