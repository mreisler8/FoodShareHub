import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ArrowRight } from 'lucide-react';

interface PostTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: string) => void;
}

export function PostTypeModal({ open, onOpenChange, onSelectType }: PostTypeModalProps) {
  const [showAllTypes, setShowAllTypes] = useState(false);

  const recommendedTypes = [
    {
      type: 'moment',
      title: 'Moment',
      description: 'Share your first food experience! Photos make it engaging.',
      match: 90,
      icon: '🍽️'
    },
    {
      type: 'dish',
      title: 'Dish',
      description: 'Dish recommendations are getting lots of engagement!',
      match: 70,
      icon: '🍕'
    }
  ];

  const allPostTypes = [
    {
      type: 'moment',
      title: 'Food Moment',
      description: 'Quick snapshot of what you\'re eating now',
      icon: '🍽️'
    },
    {
      type: 'dish',
      title: 'Dish Review',
      description: 'Thoughtful opinion on a specific dish',
      icon: '🍕'
    },
    {
      type: 'restaurant',
      title: 'Restaurant Rec',
      description: 'Shoutout a restaurant you love',
      icon: '📍'
    }
  ];

  const handleTypeSelect = (type: string) => {
    onSelectType(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-orange-500">🍕</span>
              Choose Post Type
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {!showAllTypes ? (
            <>
              {/* Recommended Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-orange-500">🍕</span>
                    Recommended for you
                  </h3>
                  <Button variant="ghost" size="sm">
                    Show all
                  </Button>
                </div>

                <div className="space-y-3">
                  {recommendedTypes.map((type) => (
                    <div
                      key={type.type}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleTypeSelect(type.type)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📈</span>
                          <Badge variant="secondary" className="text-xs">
                            {type.match}% match
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium">{type.title}</h4>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Or choose from all post types */}
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setShowAllTypes(true)}
                  className="text-sm"
                >
                  Or choose from all post types
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Not sure which type to choose? We'll suggest the best option based on your activity.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* All Post Types */}
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllTypes(false)}
                  className="mb-4"
                >
                  ← Back to recommended
                </Button>

                <div className="space-y-3">
                  {allPostTypes.map((type) => (
                    <div
                      key={type.type}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleTypeSelect(type.type)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{type.icon}</span>
                        <div>
                          <h4 className="font-medium">{type.title}</h4>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}