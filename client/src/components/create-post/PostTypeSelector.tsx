
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  List, 
  Camera, 
  Utensils, 
  Users, 
  MapPin, 
  Star,
  Clock,
  ChevronRight
} from 'lucide-react';

export enum PostType {
  LIST = 'list',
  MOMENT = 'moment',
  DISH = 'dish'
}

interface PostTypeSelectorProps {
  onSelectType: (type: PostType) => void;
  userHistory?: {
    listsCreated: number;
    momentsShared: number;
    dishesRecommended: number;
    circlesJoined: number;
  };
}

export function PostTypeSelector({ onSelectType, userHistory }: PostTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<PostType | null>(null);

  const handleSelectType = (type: PostType) => {
    setSelectedType(type);
    onSelectType(type);
  };

  // Smart nudges based on user history
  const getRecommendedBadge = () => {
    if (!userHistory) return null;
    
    const { listsCreated, momentsShared, circlesJoined } = userHistory;
    
    if (listsCreated === 0 && circlesJoined > 0) {
      return PostType.LIST;
    }
    if (momentsShared === 0) {
      return PostType.MOMENT;
    }
    return null;
  };

  const recommendedType = getRecommendedBadge();

  const postTypes = [
    {
      type: PostType.LIST,
      icon: List,
      title: "List of Spots",
      description: "Create a ranked list of restaurants with drag-and-drop ordering",
      features: ["Multiple restaurants", "Drag & drop ranking", "Share with circles", "Collaborative editing"],
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
      iconColor: "text-blue-600",
      examples: "Best Pizza in NYC, Weekend Brunch Spots, Date Night Restaurants"
    },
    {
      type: PostType.MOMENT,
      icon: Camera,
      title: "Food Moment",
      description: "Share a single dining experience with photos and details",
      features: ["Photo required", "Restaurant tagging", "Rating & review", "Atmosphere notes"],
      color: "bg-green-50 border-green-200 hover:bg-green-100",
      iconColor: "text-green-600",
      examples: "Amazing dinner at..., Just tried this new place, Perfect date night"
    },
    {
      type: PostType.DISH,
      icon: Utensils,
      title: "Recommend a Dish",
      description: "Highlight a specific dish you loved at a restaurant",
      features: ["Dish-focused", "Restaurant context", "Optional photo", "Quick sharing"],
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
      iconColor: "text-orange-600",
      examples: "The truffle pasta at..., Best burger in town, Must-try appetizer"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          What do you want to share?
        </h1>
        <p className="text-gray-600 text-lg">
          Choose the best format for your food experience
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {postTypes.map(({ type, icon: Icon, title, description, features, color, iconColor, examples }) => (
          <Card 
            key={type} 
            className={`cursor-pointer transition-all duration-200 ${color} border-2 hover:shadow-lg relative`}
            onClick={() => handleSelectType(type)}
          >
            {recommendedType === type && (
              <Badge className="absolute -top-2 -right-2 bg-primary text-white">
                Recommended
              </Badge>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg bg-white`}>
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription className="text-sm">
                    {description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Features:</h4>
                <ul className="space-y-1">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Examples:</h4>
                <p className="text-xs text-gray-500 italic">
                  {examples}
                </p>
              </div>

              <Button 
                className="w-full mt-4" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectType(type);
                }}
              >
                Choose {title}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Not sure which one to choose? Start with a <strong>Food Moment</strong> to share your latest dining experience.
        </p>
      </div>
    </div>
  );
}
