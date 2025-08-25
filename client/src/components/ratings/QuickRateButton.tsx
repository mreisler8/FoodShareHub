import React, { useState } from 'react';
import { Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import QuickRateModal from './QuickRateModal';

interface QuickRateButtonProps {
  restaurant: {
    id?: number;
    googlePlaceId?: string;
    name: string;
    location?: string;
    address?: string;
  };
  existingRating?: any;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export default function QuickRateButton({ 
  restaurant, 
  existingRating, 
  variant = 'default',
  className 
}: QuickRateButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderButton = () => {
    switch (variant) {
      case 'compact':
        return (
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="outline"
            size="sm"
            className={cn("h-8 px-3 text-xs", className)}
          >
            <Star className="h-3 w-3 mr-1" />
            {existingRating ? 'Update' : 'Rate'}
          </Button>
        );
      
      case 'icon':
        return (
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", className)}
          >
            <Star className={cn(
              "h-4 w-4",
              existingRating ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
            )} />
          </Button>
        );
      
      default:
        return (
          <Button
            onClick={() => setIsModalOpen(true)}
            variant={existingRating ? "outline" : "default"}
            className={cn(
              "gap-2",
              existingRating && "border-yellow-300 bg-yellow-50 hover:bg-yellow-100",
              className
            )}
          >
            <Zap className="h-4 w-4" />
            {existingRating ? (
              <>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                Update Rating
              </>
            ) : (
              'Quick Rate'
            )}
          </Button>
        );
    }
  };

  return (
    <>
      {renderButton()}
      <QuickRateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        restaurant={restaurant}
        existingRating={existingRating}
      />
    </>
  );
}