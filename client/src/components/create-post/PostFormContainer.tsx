
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

type FormStep = 'type' | 'content' | 'metadata' | 'sharing';

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
    setCurrentStep('metadata');
  };

  const handleMetadataSubmit = (metadata: any) => {
    setFormData({ ...formData, ...metadata });
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
      case 'metadata':
        setCurrentStep('content');
        break;
      case 'sharing':
        setCurrentStep('metadata');
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'type':
        return 'What do you want to share?';
      case 'content':
        return `Create ${selectedType === 'list' ? 'List of Spots' : selectedType === 'moment' ? 'Food Moment' : 'Dish Recommendation'}`;
      case 'metadata':
        return 'Add tags and details';
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
    <div className="max-h-[90vh] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 pb-20">
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

          {(currentStep === 'metadata' || currentStep === 'sharing') && (
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
        {['content', 'metadata', 'sharing'].map((step, index) => (
          <React.Fragment key={step}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === step
                ? 'bg-primary text-white'
                : ['content', 'metadata', 'sharing'].indexOf(currentStep) > index
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {index + 1}
            </div>
            {index < 2 && (
              <div className={`h-1 w-12 ${
                ['content', 'metadata', 'sharing'].indexOf(currentStep) > index
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

      {/* Step 3: Metadata (Tags) */}
      {currentStep === 'metadata' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Add tags to help others discover your post</h3>
            <p className="text-gray-600 mb-4">Tags make your post more discoverable and help categorize your content.</p>
            
            <TagSelector
              selectedTags={formData.tags || []}
              onTagsChange={(tags) => setFormData({ ...formData, tags })}
              suggestedTags={[
                'spicy', 'hiddenGem', 'noodles', 'pizza', 'brunch', 'dateNight',
                'familyFriendly', 'vegan', 'glutenFree', 'affordable', 'upscale',
                'quickBite', 'musttry', 'newOpening', 'localFavorite', 'authentic'
              ]}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={() => handleMetadataSubmit({ tags: formData.tags || [] })}>
              Continue to Sharing
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Sharing */}
      {currentStep === 'sharing' && (
        <ShareDestinationPicker
          circles={circles || []}
          onShareDestinationChange={handleFinalSubmit}
        />
      )}

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
    </div>
  );
}
