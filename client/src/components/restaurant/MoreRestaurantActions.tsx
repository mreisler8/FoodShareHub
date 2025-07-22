import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PenTool, Camera, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MoreRestaurantActionsProps {
  restaurant: {
    name: string;
    location: string;
  };
}

export default function MoreRestaurantActions({ restaurant }: MoreRestaurantActionsProps) {
  const { toast } = useToast();

  const handleWriteReview = () => {
    // TODO: Open review form modal when implemented
    toast({
      title: "Write Review",
      description: "Feature coming soon - comprehensive review system in development"
    });
  };

  const handleAddPhotos = () => {
    // TODO: Open photo upload modal when implemented
    toast({
      title: "Add Photos",
      description: "Feature coming soon - photo upload system in development"
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MoreHorizontal className="h-5 w-5" />
          More Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={handleWriteReview}
        >
          <PenTool className="h-4 w-4" />
          ✍️ Write Review
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={handleAddPhotos}
        >
          <Camera className="h-4 w-4" />
          📸 Add Photos
        </Button>
      </CardContent>
    </Card>
  );
}