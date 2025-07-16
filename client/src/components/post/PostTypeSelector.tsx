import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  List, 
  Camera, 
  UtensilsCrossed, 
  MapPin,
  Star,
  Users,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

export type PostType = 'list' | 'moment' | 'dish';

interface PostTypeOption {
  type: PostType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  features: string[];
}

interface PostTypeSelectorProps {
  selectedType: PostType | null;
  onTypeSelect: (type: PostType) => void;
  onBack?: () => void;
  className?: string;
}

const POST_TYPE_OPTIONS: PostTypeOption[] = [
  {
    type: 'list',
    title: 'List of Spots',
    subtitle: 'Create a curated list of restaurants',
    icon: <List className="w-6 h-6" />,
    color: 'bg-blue-500',
    badge: 'Popular',
    features: ['Multi-restaurant selection', 'Drag & drop ranking', 'Share with circles']
  },
  {
    type: 'moment',
    title: 'Food Moment',
    subtitle: 'Share your dining experience',
    icon: <Camera className="w-6 h-6" />,
    color: 'bg-green-500',
    badge: 'Classic',
    features: ['Single restaurant focus', 'Photo required', 'Rating & review']
  },
  {
    type: 'dish',
    title: 'Recommend a Dish',
    subtitle: 'Highlight a specific dish',
    icon: <UtensilsCrossed className="w-6 h-6" />,
    color: 'bg-orange-500',
    badge: 'New',
    features: ['Dish-focused content', 'Restaurant search', 'Taste notes']
  }
];

export function PostTypeSelector({ 
  selectedType, 
  onTypeSelect, 
  onBack,
  className = '' 
}: PostTypeSelectorProps) {
  if (selectedType) {
    const option = POST_TYPE_OPTIONS.find(opt => opt.type === selectedType);
    if (!option) return null;

    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${option.color} text-white`}>
              {option.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{option.title}</h3>
              <p className="text-sm text-muted-foreground">{option.subtitle}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">What do you want to share?</h2>
        <p className="text-muted-foreground">
          Choose the type of content you'd like to create
        </p>
      </div>

      <div className="grid gap-4">
        {POST_TYPE_OPTIONS.map((option) => (
          <Card 
            key={option.type}
            className="p-6 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/20"
            onClick={() => onTypeSelect(option.type)}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${option.color} text-white flex-shrink-0`}>
                {option.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{option.title}</h3>
                  {option.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {option.badge}
                    </Badge>
                  )}
                </div>
                
                <p className="text-muted-foreground mb-3">
                  {option.subtitle}
                </p>
                
                <div className="space-y-1">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
              
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}