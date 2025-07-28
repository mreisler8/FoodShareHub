import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Globe, Users, UserPlus, Lock, Eye, ChevronDown } from 'lucide-react';

export type VisibilityLevel = 'public' | 'circle' | 'followers' | 'private';

interface PrivacyOption {
  level: VisibilityLevel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  audience: string;
  color: string;
}

interface PrivacySelectorProps {
  value: VisibilityLevel;
  onChange: (level: VisibilityLevel) => void;
  contentType?: 'list' | 'post' | 'moment' | 'rating';
  disabled?: boolean;
  showPreview?: boolean;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    level: 'circle',
    label: 'Food Circles',
    icon: Users,
    description: 'Share with your trusted food community',
    audience: 'Circle members',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    level: 'followers',
    label: 'Followers',
    icon: UserPlus,
    description: 'People who follow your recommendations',
    audience: 'Your followers',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    level: 'public',
    label: 'Everyone',
    icon: Globe,
    description: 'Anyone can discover this content',
    audience: 'All Circles users',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    level: 'private',
    label: 'Just Me',
    icon: Lock,
    description: 'Keep this private for now',
    audience: 'Only you',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
];

export function PrivacySelector({ 
  value, 
  onChange, 
  contentType = 'list',
  disabled = false,
  showPreview = true 
}: PrivacySelectorProps) {
  const [open, setOpen] = useState(false);
  
  const selectedOption = PRIVACY_OPTIONS.find(option => option.level === value) || PRIVACY_OPTIONS[0];
  const IconComponent = selectedOption.icon;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto p-3"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <IconComponent className="h-4 w-4" />
              <span className="font-medium">{selectedOption.label}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3">
            <h4 className="font-medium text-sm mb-3">
              Who should see this {contentType}?
            </h4>
            
            <div className="space-y-1">
              {PRIVACY_OPTIONS.map((option) => {
                const OptionIcon = option.icon;
                const isSelected = option.level === value;
                
                return (
                  <button
                    key={option.level}
                    onClick={() => {
                      onChange(option.level);
                      setOpen(false);
                    }}
                    className={`
                      w-full text-left p-3 rounded-lg transition-colors
                      ${isSelected 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <OptionIcon className={`h-4 w-4 mt-0.5 ${
                        isSelected ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium text-sm ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {option.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {option.audience}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {showPreview && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Eye className="h-3 w-3" />
          <span>
            {selectedOption.audience} will see this {contentType}
          </span>
        </div>
      )}
    </div>
  );
}

export default PrivacySelector;