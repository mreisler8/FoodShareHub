import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Star, MapPin, List, Clock } from 'lucide-react';

export enum PostType {
  MOMENT = 'moment',
  DISH = 'dish',
  LIST = 'list'
}

interface PostTypeOption {
  type: PostType;
  icon: React.ReactNode;
  title: string;
  description: string;
  emoji: string;
  quickInfo: string;
}

const postTypeOptions: PostTypeOption[] = [
  {
    type: PostType.MOMENT,
    icon: <Camera className="h-5 w-5" />,
    title: 'Food Moment',
    description: 'Snap and share a quick food pic',
    emoji: '🍽️',
    quickInfo: 'Quick & easy'
  },
  {
    type: PostType.DISH,
    icon: <Star className="h-5 w-5" />,
    title: 'Dish Review',
    description: 'Share thoughts on a specific dish',
    emoji: '📝',
    quickInfo: 'Detailed review'
  },
  {
    type: PostType.LIST,
    icon: <List className="h-5 w-5" />,
    title: 'Restaurant Rec',
    description: 'Recommend a spot you love',
    emoji: '📍',
    quickInfo: 'Share favorites'
  }
];

interface PostTypeSelectorProps {
  onSelectType: (type: PostType) => void;
  userHistory?: any;
  selectedType?: PostType | null;
  onBack?: () => void;
  className?: string;
}

export function PostTypeSelector({ 
  onSelectType, 
  userHistory, 
  selectedType, 
  onBack,
  className = '' 
}: PostTypeSelectorProps) {
  const handleTypeSelect = (type: PostType) => {
    onSelectType(type);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">What do you want to share?</h2>
        <p className="text-gray-600">Choose the type of experience you'd like to create</p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
        {postTypeOptions.map((option) => (
          <Card
            key={option.type}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 ${
              selectedType === option.type
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-primary/50'
            }`}
            onClick={() => handleTypeSelect(option.type)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{option.emoji}</div>
                  <div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {option.quickInfo}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">{option.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Hint */}
      {userHistory && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
            <Clock className="h-3 w-3" />
            <span>Last shared: {userHistory.lastPostType || 'None yet'}</span>
          </div>
        </div>
      )}
    </div>
  );
}