
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

interface PostFormContainerProps {
  onClose?: () => void;
}

type FormStep = 'type' | 'content' | 'sharing';

export function PostFormContainer({ onClose }: PostFormContainerProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('type');
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);

  const handleModalClose = () => {
    // Reset form state
    setCurrentStep('type');
    setSelectedType(null);
    setFormData({});
    setShowPreview(false);
    
    if (onClose) {
      onClose();
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
    setCurrentStep('sharing');
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

      if (!response.ok) throw new Error('Failed to create post');

      // Success! Close modal and return to previous state
      handleModalClose();
    } catch (error) {
      console.error('Error creating post:', error);
      // Handle error (show toast, etc.)
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

          {currentStep === 'sharing' && (
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['content', 'sharing'].map((step, index) => (
            <React.Fragment key={step}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step
                  ? 'bg-primary text-white'
                  : ['content', 'sharing'].indexOf(currentStep) > index
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {index + 1}
              </div>
              {index < 1 && (
                <div className={`h-1 w-12 ${
                  ['content', 'sharing'].indexOf(currentStep) > index
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 2: Content Form */}
        {currentStep === 'content' && selectedType && (
          <div>
            {selectedType === PostType.LIST && (
              <ListOfSpotsForm 
                onSubmit={handleContentSubmit}
                onCancel={handleBack}
              />
            )}

            {selectedType === PostType.MOMENT && (
              <FoodMomentForm 
                onSubmit={handleContentSubmit}
                onCancel={handleBack}
              />
            )}

            {selectedType === PostType.DISH && (
              <RecommendDishForm 
                onSubmit={handleContentSubmit}
                onCancel={handleBack}
              />
            )}
          </div>
        )}

        {/* Step 3: Sharing */}
        {currentStep === 'sharing' && (
          <ShareDestinationPicker
            circles={circles || []}
            onShareDestinationChange={handleFinalSubmit}
          />
        )}
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
