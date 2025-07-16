
import React, { useState } from 'react';
import { PostTypeSelector, PostType } from './PostTypeSelector';
import { ListOfSpotsForm } from './ListOfSpotsForm';
import { FoodMomentForm } from './FoodMomentForm';
import { RecommendDishForm } from './RecommendDishForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface PostFormContainerProps {
  onClose?: () => void;
}

export function PostFormContainer({ onClose }: PostFormContainerProps) {
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [formData, setFormData] = useState<any>(null);

  // Get user history for smart nudges
  const { data: userHistory } = useQuery({
    queryKey: ['/api/me/post-history'],
    queryFn: async () => {
      const response = await fetch('/api/me/post-history');
      if (!response.ok) throw new Error('Failed to fetch user history');
      return response.json();
    },
  });

  const handleBackToTypeSelector = () => {
    setSelectedType(null);
    setFormData(null);
  };

  const handleFormSubmit = (data: any) => {
    console.log('Form submitted with data:', data);
    // Handle form submission based on type
    setFormData(data);
    
    // Close modal or navigate as needed
    if (onClose) {
      onClose();
    }
  };

  if (!selectedType) {
    return (
      <PostTypeSelector 
        onSelectType={setSelectedType}
        userHistory={userHistory}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBackToTypeSelector}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to post types
        </Button>
      </div>

      {/* Dynamic form based on selected type */}
      {selectedType === PostType.LIST && (
        <ListOfSpotsForm 
          onSubmit={handleFormSubmit}
          onCancel={handleBackToTypeSelector}
        />
      )}

      {selectedType === PostType.MOMENT && (
        <FoodMomentForm 
          onSubmit={handleFormSubmit}
          onCancel={handleBackToTypeSelector}
        />
      )}

      {selectedType === PostType.DISH && (
        <RecommendDishForm 
          onSubmit={handleFormSubmit}
          onCancel={handleBackToTypeSelector}
        />
      )}
    </div>
  );
}
