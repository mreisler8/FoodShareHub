import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PostTypeSelector, PostType } from './PostTypeSelector';
import { PostTypeIcon, getPostTypeLabel } from './PostTypeIcon';
import { ChevronLeft, ChevronRight, Eye, Send, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface MobilePostCreationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: PostType;
}

export function MobilePostCreation({ open, onOpenChange, defaultType }: MobilePostCreationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<PostType | null>(defaultType || null);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const steps = [
    { id: 'type', title: 'Choose Type', icon: Sparkles },
    { id: 'content', title: 'Add Content', icon: Eye },
    { id: 'preview', title: 'Preview', icon: Send }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleTypeSelect = (type: PostType) => {
    setSelectedType(type);
    handleNext();
  };

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      return apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify(postData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Success!",
        description: "Your post has been published!",
        duration: 3000,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async () => {
    if (!selectedType) return;
    
    setIsSubmitting(true);
    
    try {
      await createPostMutation.mutateAsync({
        ...formData,
        postType: selectedType,
        userId: user?.id
      });
    } catch (error) {
      // Error handling is in onError
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedType(defaultType || null);
      setFormData({});
      setIsSubmitting(false);
    }
  }, [open, defaultType]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col md:hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => currentStep > 0 ? handleBack() : onOpenChange(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Create Post</h1>
          {selectedType && (
            <PostTypeIcon type={selectedType} size="sm" />
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {currentStep + 1}/{steps.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex-1 h-1 ${
              index <= currentStep ? 'bg-primary' : 'bg-muted'
            } transition-colors duration-300`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentStep === 0 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">What would you like to share?</h2>
              <p className="text-muted-foreground">Choose the type of post that best fits your content</p>
            </div>
            
            <div className="grid gap-4">
              {(['list', 'moment', 'dish'] as PostType[]).map((type) => (
                <Card
                  key={type}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors touch-optimized"
                  onClick={() => handleTypeSelect(type)}
                >
                  <div className="flex items-center gap-3">
                    <PostTypeIcon type={type} size="lg" />
                    <div className="flex-1 text-left">
                      <h3 className="font-medium">{getPostTypeLabel(type)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {type === 'list' && 'Share a curated list of your favorite spots'}
                        {type === 'moment' && 'Capture a special food experience'}
                        {type === 'dish' && 'Recommend a specific dish to others'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentStep === 1 && selectedType && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <PostTypeIcon type={selectedType} size="md" />
                <h2 className="text-xl font-semibold">{getPostTypeLabel(selectedType)}</h2>
              </div>
              <p className="text-muted-foreground">Fill in the details for your post</p>
            </div>
            
            {/* Form content would go here based on selectedType */}
            <div className="space-y-4">
              <div className="text-center text-muted-foreground">
                Form content for {selectedType} post will be rendered here
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Preview Your Post</h2>
              <p className="text-muted-foreground">Review your post before publishing</p>
            </div>
            
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{user?.name || 'You'}</p>
                    <p className="text-sm text-muted-foreground">Just now</p>
                  </div>
                </div>
                
                <div className="text-center text-muted-foreground">
                  Post preview will be rendered here
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              className="flex-1"
              disabled={currentStep === 0 && !selectedType}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publishing...' : 'Publish Post'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}