import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { PostTypeSelector, PostType } from './PostTypeSelector';
import { SmartPostTypeSelector } from './SmartPostTypeSelector';
import { PostTypeAnalytics } from './PostTypeAnalytics';
import { ListOfSpotsForm } from './forms/ListOfSpotsForm';
import { FoodMomentForm } from './forms/FoodMomentForm';
import { RecommendDishForm } from './forms/RecommendDishForm';
import { PostPreviewModal } from './PostPreviewModal';
import { SuccessAnimation } from './SuccessAnimation';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Card } from '@/components/ui/card';
import { X, ArrowLeft, Eye, Send, Sparkles } from 'lucide-react';

interface ModernCreatePostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: PostType;
}

interface FormState {
  [key: string]: any;
}

export function ModernCreatePost({ 
  open, 
  onOpenChange, 
  defaultType 
}: ModernCreatePostProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // State management
  const [selectedType, setSelectedType] = useState<PostType | null>(defaultType || null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formStates, setFormStates] = useState<Record<PostType, FormState>>({
    list: {},
    moment: {},
    dish: {}
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false);
  
  // Refs for animations
  const transitionRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Smooth transition between post types
  const handleTypeChange = async (type: PostType) => {
    if (type === selectedType) return;
    
    setIsTransitioning(true);
    
    // Save current form state
    if (selectedType) {
      setFormStates(prev => ({
        ...prev,
        [selectedType]: getCurrentFormState()
      }));
    }
    
    // Wait for exit animation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setSelectedType(type);
    
    // Wait for enter animation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setIsTransitioning(false);
    
    // Restore saved form state
    if (formStates[type]) {
      restoreFormState(type, formStates[type]);
    }
  };

  // Get current form state (to be implemented by individual forms)
  const getCurrentFormState = (): FormState => {
    // This would be implemented to get current form values
    return {};
  };

  // Restore form state (to be implemented by individual forms)
  const restoreFormState = (type: PostType, state: FormState) => {
    // This would be implemented to restore form values
  };

  // Handle preview before publishing
  const handlePreview = (data: any) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  // Optimistic update for immediate feedback
  const handleOptimisticCreate = (data: any) => {
    setIsOptimisticUpdate(true);
    
    // Add optimistic post to cache
    queryClient.setQueryData(['/api/posts'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        data: [{
          id: `temp-${Date.now()}`,
          ...data,
          createdAt: new Date().toISOString(),
          isOptimistic: true
        }, ...old.data]
      };
    });
    
    // Show success animation
    setShowSuccess(true);
    
    // Close modal after animation
    setTimeout(() => {
      onOpenChange(false);
      setShowSuccess(false);
      setIsOptimisticUpdate(false);
    }, 2000);
  };

  // Create post mutation with optimistic updates
  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      // Handle different post types
      if (postData.postType === 'list') {
        // Create list first, then create post referencing it
        const listData = {
          name: postData.listName,
          description: postData.description,
          shareWithCircle: postData.visibility.circleIds.length > 0,
          makePublic: postData.visibility.public,
          tags: [],
          restaurants: postData.restaurants
        };

        const list = await apiRequest('/api/lists', {
          method: 'POST',
          body: JSON.stringify(listData)
        });

        // Create post with list reference
        const postPayload = {
          userId: user?.id,
          restaurantId: postData.restaurants[0]?.id || null,
          content: `Created a list: ${postData.listName}${postData.description ? `\n\n${postData.description}` : ''}`,
          rating: 5, // Default rating for list posts
          visibility: postData.visibility,
          postType: 'list',
          metadata: {
            listId: list.id,
            listName: postData.listName,
            restaurantCount: postData.restaurants.length,
            ...postData.metadata
          }
        };

        return apiRequest('/api/posts', {
          method: 'POST',
          body: JSON.stringify(postPayload)
        });
      } else {
        // Handle moment and dish posts
        const postPayload = {
          userId: user?.id,
          restaurantId: postData.restaurantId,
          content: postData.content,
          rating: postData.rating,
          visibility: postData.visibility,
          postType: postData.postType,
          metadata: postData.metadata
        };

        return apiRequest('/api/posts', {
          method: 'POST',
          body: JSON.stringify(postPayload)
        });
      }
    },
    onSuccess: (data) => {
      // Remove optimistic update and add real data
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      
      // Show type-specific success message
      const messages = {
        list: 'Your spot list has been published and is now discoverable by your circle!',
        moment: 'Your food moment has been captured and shared with your community!',
        dish: 'Your dish recommendation has been added to help others discover great food!'
      };
      
      toast({
        title: "Success!",
        description: messages[selectedType as PostType] || 'Post created successfully!',
        duration: 4000,
      });
      
      // Analytics tracking
      if (selectedType) {
        // Track successful creation
        queryClient.setQueryData(['analytics', 'post_creation'], (old: any) => ({
          ...old,
          [selectedType]: (old?.[selectedType] || 0) + 1
        }));
      }
    },
    onError: (error) => {
      // Remove optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setIsOptimisticUpdate(false);
      
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission with optimistic updates
  const handleSubmit = async (data: any) => {
    // Start optimistic update
    handleOptimisticCreate(data);
    
    // Submit to server
    try {
      await createPostMutation.mutateAsync(data);
    } catch (error) {
      // Error handling is done in onError
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedType(defaultType || null);
      setFormStates({ list: {}, moment: {}, dish: {} });
      setShowPreview(false);
      setPreviewData(null);
      setShowSuccess(false);
      setIsOptimisticUpdate(false);
    }
  }, [open, defaultType]);

  // Render form based on selected type
  const renderForm = () => {
    if (!selectedType) return null;
    
    const formProps = {
      onSubmit: handleSubmit,
      onPreview: handlePreview,
      isLoading: createPostMutation.isPending || isOptimisticUpdate,
      initialData: formStates[selectedType],
      onStateChange: (state: FormState) => {
        setFormStates(prev => ({ ...prev, [selectedType]: state }));
      }
    };

    switch (selectedType) {
      case 'list':
        return <ListOfSpotsForm {...formProps} />;
      case 'moment':
        return <FoodMomentForm {...formProps} />;
      case 'dish':
        return <RecommendDishForm {...formProps} />;
      default:
        return null;
    }
  };

  // Success animation overlay
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <SuccessAnimation 
            type={selectedType!} 
            onComplete={() => {
              setShowSuccess(false);
              onOpenChange(false);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTypeChange(null as any)}
                    className="p-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {selectedType ? 'Create Your Post' : 'Choose Post Type'}
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="relative overflow-hidden">
            {/* Post Type Selection */}
            <div 
              className={`transition-all duration-300 ease-in-out ${
                selectedType ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'
              }`}
              style={{ display: selectedType ? 'none' : 'block' }}
            >
              <div className="space-y-6">
                <SmartPostTypeSelector
                  selectedType={selectedType}
                  onTypeSelect={handleTypeChange}
                />
                
                <div className="text-center text-sm text-muted-foreground">
                  Not sure which type to choose? We'll suggest the best option based on your activity.
                </div>
              </div>
            </div>

            {/* Form Display */}
            <div 
              ref={formRef}
              className={`transition-all duration-300 ease-in-out ${
                selectedType ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
              }`}
              style={{ display: selectedType ? 'block' : 'none' }}
            >
              {isTransitioning ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {renderForm()}
                </div>
              )}
            </div>
          </div>

          {/* Analytics Tracking */}
          <PostTypeAnalytics 
            eventType="view" 
            postType={selectedType || undefined}
            metadata={{ modal: 'create_post' }}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <PostPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        data={previewData}
        onConfirm={() => {
          setShowPreview(false);
          if (previewData) {
            handleSubmit(previewData);
          }
        }}
      />
    </>
  );
}