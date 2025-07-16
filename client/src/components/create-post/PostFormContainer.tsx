
import React, { useState } from 'react';
import { PostTypeSelector, PostType } from './PostTypeSelector';
import { ListOfSpotsForm } from './ListOfSpotsForm';
import { FoodMomentForm } from './FoodMomentForm';
import { RecommendDishForm } from './RecommendDishForm';
import { TagSelector } from '../post/TagSelector';
import { PostPreviewModal } from '../post/PostPreviewModal';
import { ShareDestinationPicker } from '../post/ShareDestinationPicker';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface PostFormContainerProps {
  onClose?: () => void;
}

type FormStep = 'type' | 'content' | 'sharing';

export function PostFormContainer({ onClose }: PostFormContainerProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('type');
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleModalClose = () => {
    // Reset form state
    setCurrentStep('type');
    setSelectedType(null);
    setFormData({});
    setShowPreview(false);
    
    if (onClose) {
      onClose();
    } else {
      // Navigate to homepage if no onClose handler
      window.location.href = '/';
    }
  };

  // Get user data and circles
  const { data: userData } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
  });

  const { data: userHistory } = useQuery({
    queryKey: ['/api/me/post-history'],
    queryFn: async () => {
      const response = await fetch('/api/me/post-history');
      if (!response.ok) throw new Error('Failed to fetch user history');
      return response.json();
    },
  });

  const { data: circles } = useQuery({
    queryKey: ['/api/me/circles'],
    queryFn: async () => {
      const response = await fetch('/api/me/circles');
      if (!response.ok) throw new Error('Failed to fetch circles');
      return response.json();
    },
  });

  const handleTypeSelect = (type: PostType) => {
    setSelectedType(type);
    setCurrentStep('content');
  };

  const handleContentSubmit = (data: any) => {
    setFormData({ ...formData, ...data });
    // Skip sharing step and submit directly
    handleFinalSubmit(data);
  };

  const handleFinalSubmit = async (shareData: any) => {
    const finalData = {
      ...formData,
      ...shareData,
      postType: selectedType
    };

    console.log('Final post data:', finalData);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: "Your post has been created successfully.",
      });

      // Success! Close modal and return to previous state
      handleModalClose();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'content':
        setCurrentStep('type');
        setSelectedType(null);
        break;
      case 'sharing':
        setCurrentStep('content');
        break;
    }
  };

  const handleCancel = () => {
    // Navigate back to homepage on cancel
    handleModalClose();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'type':
        return 'What do you want to share?';
      case 'content':
        return `Create ${selectedType === 'list' ? 'Restaurant Rec' : selectedType === 'moment' ? 'Food Moment' : 'Dish Review'}`;
      case 'sharing':
        return 'Share your post';
      default:
        return '';
    }
  };

  // Step 1: Type Selection
  if (currentStep === 'type') {
    return (
      <PostTypeSelector 
        onSelectType={handleTypeSelect}
        userHistory={userHistory}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto flex flex-col">
      <div className="flex-1 p-6">
        {/* Header with back button and preview */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <h1 className="text-2xl font-bold">{getStepTitle()}</h1>

          {/* Removed preview button since forms handle submission directly */}
        </div>

        {/* Progress indicator - Simplified since we removed sharing step */}
        {currentStep === 'content' && (
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-primary text-white">
              1
            </div>
            <span className="text-sm text-gray-600">Fill out your post details</span>
          </div>
        )}

        {/* Step 2: Content Form */}
        {currentStep === 'content' && selectedType && (
          <div>
            {selectedType === PostType.LIST && (
              <ListOfSpotsForm 
                onSubmit={handleContentSubmit}
                onCancel={handleCancel}
              />
            )}

            {selectedType === PostType.MOMENT && (
              <FoodMomentForm 
                onSubmit={handleContentSubmit}
                onCancel={handleCancel}
              />
            )}

            {selectedType === PostType.DISH && (
              <RecommendDishForm 
                onSubmit={handleContentSubmit}
                onCancel={handleCancel}
              />
            )}
          </div>
        )}

        {/* Step 3: Sharing - Removed since forms handle their own sharing */}
      </div>

      {/* Preview Modal */}
      {showPreview && userData && (
        <PostPreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          data={{
            postType: selectedType!,
            ...formData,
            user: userData
          }}
          onConfirm={() => {
            setShowPreview(false);
            if (currentStep === 'sharing') {
              // Continue to final submission
              handleFinalSubmit(formData);
            }
          }}
        />
      )}
    </div>
  );
}
