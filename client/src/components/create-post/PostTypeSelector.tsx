
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  List, 
  Camera, 
  Utensils, 
  ChevronRight,
  Sparkles,
  Star,
  TrendingUp
} from 'lucide-react';

export enum PostType {
  LIST = 'list',
  MOMENT = 'moment',
  DISH = 'dish'
}

interface PostTypeCard {
  type: PostType;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  examples: string;
  color: string;
  accentColor: string;
  badge?: string;
  badgeColor?: string;
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
  const [hoveredType, setHoveredType] = useState<PostType | null>(null);

  // Smart recommendation logic
  const getRecommendedType = (): PostType | null => {
    if (!userHistory) return null;
    
    const { listsCreated, momentsShared, circlesJoined } = userHistory;
    
    // New user - recommend moment
    if (momentsShared === 0) return PostType.MOMENT;
    
    // Has circles but no lists - recommend list
    if (listsCreated === 0 && circlesJoined > 0) return PostType.LIST;
    
    return null;
  };

  const recommendedType = getRecommendedType();

  const postTypeCards: PostTypeCard[] = [
    {
      type: PostType.MOMENT,
      icon: <Camera className="w-8 h-8" />,
      title: "Food Moment",
      subtitle: "Snap and share a quick food pic",
      description: "Perfect for sharing your dining experience with photos and quick thoughts",
      features: ["Photo required", "Quick capture", "Rating & review", "Instant sharing"],
      examples: "Amazing dinner at... • Just tried this new place • Perfect date night",
      color: "bg-gradient-to-br from-green-50 to-emerald-50",
      accentColor: "text-green-600",
      badge: recommendedType === PostType.MOMENT ? "Recommended" : "Most Popular",
      badgeColor: recommendedType === PostType.MOMENT ? "bg-primary" : "bg-green-100 text-green-700"
    },
    {
      type: PostType.LIST,
      icon: <List className="w-8 h-8" />,
      title: "List of Spots",
      subtitle: "Create a curated list of restaurants",
      description: "Build ranked collections and share with your circles",
      features: ["Multi-restaurant", "Drag & drop ranking", "Share with circles", "Collaborative"],
      examples: "Best Pizza in NYC • Weekend Brunch Spots • Date Night Restaurants",
      color: "bg-gradient-to-br from-blue-50 to-cyan-50",
      accentColor: "text-blue-600",
      badge: recommendedType === PostType.LIST ? "Recommended" : "Great for Groups",
      badgeColor: recommendedType === PostType.LIST ? "bg-primary" : "bg-blue-100 text-blue-700"
    },
    {
      type: PostType.DISH,
      icon: <Utensils className="w-8 h-8" />,
      title: "Recommend a Dish",
      subtitle: "Highlight a specific dish you loved",
      description: "Focus on that one incredible dish that stood out",
      features: ["Dish-focused", "Restaurant context", "Taste notes", "Quick recommendation"],
      examples: "The truffle pasta at... • Best burger in town • Must-try appetizer",
      color: "bg-gradient-to-br from-orange-50 to-amber-50",
      accentColor: "text-orange-600",
      badge: "Trending",
      badgeColor: "bg-orange-100 text-orange-700"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">
            What do you want to share?
          </h1>
        </div>
        <p className="text-gray-600 text-lg">
          Choose the perfect format for your food experience
        </p>
      </div>

      {/* Card Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {postTypeCards.map((card) => (
          <Card 
            key={card.type}
            className={`
              cursor-pointer transition-all duration-300 border-2 relative overflow-hidden
              ${hoveredType === card.type 
                ? 'shadow-xl scale-105 border-primary' 
                : 'shadow-md hover:shadow-lg border-gray-200'
              }
              ${card.color}
            `}
            onMouseEnter={() => setHoveredType(card.type)}
            onMouseLeave={() => setHoveredType(null)}
            onClick={() => onSelectType(card.type)}
          >
            {/* Badge */}
            {card.badge && (
              <Badge 
                className={`absolute top-4 right-4 z-10 ${card.badgeColor} border-0`}
              >
                {card.badge === "Recommended" && <Star className="w-3 h-3 mr-1" />}
                {card.badge === "Trending" && <TrendingUp className="w-3 h-3 mr-1" />}
                {card.badge}
              </Badge>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-white shadow-sm ${card.accentColor}`}>
                  {card.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{card.title}</CardTitle>
                  <CardDescription className="text-sm font-medium">
                    {card.subtitle}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                {card.description}
              </p>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-800">Features:</h4>
                <ul className="grid grid-cols-2 gap-1">
                  {card.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Examples */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-800">Examples:</h4>
                <p className="text-xs text-gray-500 italic leading-relaxed">
                  {card.examples}
                </p>
              </div>

              {/* CTA Button */}
              <Button 
                className="w-full mt-4 group" 
                variant={hoveredType === card.type ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectType(card.type);
                }}
              >
                Create {card.title}
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Tip */}
      <div className="text-center bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          💡 <strong>Not sure which one to choose?</strong> Start with a{' '}
          <span className="font-semibold text-green-600">Food Moment</span> to share your latest dining experience.
        </p>
      </div>
    </div>
  );
}
