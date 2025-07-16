import { useState } from 'react';
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

interface EnhancedCreatePostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: PostType;
}

export function EnhancedCreatePost({ 
  open, 
  onOpenChange, 
  defaultType 
}: EnhancedCreatePostProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<PostType | null>(defaultType || null);

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
          images: postData.images || [],
          videos: postData.videos || [],
          imageTags: postData.imageTags || [],
          metadata: postData.metadata || {}
        };

        return apiRequest('/api/posts', {
          method: 'POST',
          body: JSON.stringify(postPayload)
        });
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      
      toast({
        title: "Success!",
        description: getSuccessMessage(selectedType),
      });
      
      onOpenChange(false);
      setSelectedType(null);
      
      // Navigate to appropriate page based on post type
      if (selectedType === 'list') {
        setLocation('/lists');
      } else {
        setLocation('/feed');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const getSuccessMessage = (type: PostType | null) => {
    switch (type) {
      case 'list':
        return "Your list of spots has been created successfully!";
      case 'moment':
        return "Your food moment has been shared!";
      case 'dish':
        return "Your dish recommendation has been posted!";
      default:
        return "Your post has been created!";
    }
  };

  const handleTypeSelect = (type: PostType) => {
    setSelectedType(type);
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const handleFormSubmit = (formData: any) => {
    createPostMutation.mutate(formData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedType(null);
  };

  const isLoading = createPostMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedType ? 'Create Your Post' : 'Create New Post'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!selectedType ? (
            <SmartPostTypeSelector
              selectedType={selectedType}
              onTypeSelect={handleTypeSelect}
            />
          ) : (
            <>
              <SmartPostTypeSelector
                selectedType={selectedType}
                onTypeSelect={handleTypeSelect}
                onBack={handleBack}
              />
              
              <div className="border-t pt-6">
                {selectedType === 'list' && (
                  <ListOfSpotsForm
                    onSubmit={handleFormSubmit}
                    isLoading={isLoading}
                  />
                )}
                
                {selectedType === 'moment' && (
                  <FoodMomentForm
                    onSubmit={handleFormSubmit}
                    isLoading={isLoading}
                  />
                )}
                
                {selectedType === 'dish' && (
                  <RecommendDishForm
                    onSubmit={handleFormSubmit}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </>
          )}
          
          {/* Analytics tracking */}
          <PostTypeAnalytics
            eventType={selectedType ? 'select' : 'view'}
            postType={selectedType || undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}