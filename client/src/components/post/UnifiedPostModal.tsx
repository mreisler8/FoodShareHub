import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, MapPin, Star, X, Loader2, Plus, Camera, UtensilsCrossed, Building } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { RestaurantSearchComponent } from '@/components/shared/RestaurantSearchComponent';
import { Restaurant } from '@/types/restaurant';
import { PostType, PostFormData, PostSubmissionData } from '@/types/post';
import MediaUploader from '@/components/MediaUploader';
import { VisibilitySelector } from '@/components/VisibilitySelector';
import { MultiSelect } from '@/components/ui/multi-select';
import { CreateListModal } from '@/components/lists/CreateListModal';
import { postService } from '@/services/postService';

interface UnifiedPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: any; // For editing
  initialType?: PostType;
}

const POST_TYPE_OPTIONS = [
  {
    type: PostType.MOMENT,
    title: 'Food Moment',
    description: 'Quick snapshot of what you\'re eating now',
    emoji: '🍽️',
    badge: 'Quick',
    color: 'bg-green-500',
    features: ['Photo encouraged', 'Quick & casual', 'Real-time sharing']
  },
  {
    type: PostType.DISH,
    title: 'Dish Review',
    description: 'Detailed review of a specific dish',
    emoji: '🍕',
    badge: 'Detailed',
    color: 'bg-orange-500',
    features: ['Dish details', 'Rating required', 'Thoughtful review']
  },
  {
    type: PostType.RESTAURANT,
    title: 'Restaurant Rec',
    description: 'Recommend a restaurant you love',
    emoji: '📍',
    badge: 'Recommendation',
    color: 'bg-blue-500',
    features: ['Overall experience', 'Would return?', 'Atmosphere notes']
  }
];

export function UnifiedPostModal({ open, onOpenChange, post, initialType }: UnifiedPostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!post;
  
  // Step management
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedType, setSelectedType] = useState<PostType | null>(initialType || null);
  
  // Form data
  const [formData, setFormData] = useState<PostFormData>({
    restaurant: null,
    rating: 0,
    description: '',
    media: [],
    tags: [],
    visibilitySettings: {
      public: true,
      followers: false,
      circleIds: []
    },
    taggedListIds: []
  });
  
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);

  // Initialize form for editing
  useEffect(() => {
    if (isEditMode && post && open) {
      if (post.restaurant) {
        setFormData(prev => ({
          ...prev,
          restaurant: {
            id: post.restaurantId?.toString() || '',
            name: post.restaurant.name,
            location: post.restaurant.location,
            source: 'database'
          }
        }));
      }
      
      setFormData(prev => ({
        ...prev,
        rating: post.rating || 0,
        description: post.content || '',
        dishName: post.dishName || '',
        category: post.category || ''
      }));
      
      if (post.images && Array.isArray(post.images)) {
        setFormData(prev => ({
          ...prev,
          media: post.images.map((url: string) => ({ url, type: 'image' }))
        }));
      }
      
      setSelectedType(post.postType || PostType.MOMENT);
      setStep('form');
    }
  }, [isEditMode, post, open]);

  // Get user's restaurant lists
  const { data: userLists = [] } = useQuery({
    queryKey: ['/api/lists'],
    select: (data: any) => data?.lists || []
  });

  const updateFormData = (updates: Partial<PostFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleTypeSelect = (type: PostType) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleBack = () => {
    if (step === 'form') {
      setStep('type');
    } else {
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setFormData({
      restaurant: null,
      rating: 0,
      description: '',
      media: [],
      tags: [],
      visibilitySettings: {
        public: true,
        followers: false,
        circleIds: []
      },
      taggedListIds: []
    });
    setSelectedType(initialType || null);
    setStep(initialType ? 'form' : 'type');
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedType || !formData.restaurant || !formData.rating || !formData.description.trim() || !user) {
        throw new Error('Missing required fields');
      }

      const submissionData: PostSubmissionData = {
        postType: selectedType,
        formData,
        userId: user.id,
        postId: isEditMode ? post.id : undefined
      };

      // Convert to the format expected by postService
      const postData = {
        restaurantId: formData.restaurant.id,
        restaurantName: formData.restaurant.name,
        restaurantLocation: formData.restaurant.location,
        rating: formData.rating,
        liked: formData.description,
        disliked: '',
        notes: formData.dishName || '',
        media: formData.media,
        imageTags: formData.tags,
        taggedListIds: formData.taggedListIds,
        visibilitySettings: formData.visibilitySettings,
        userId: user.id,
        postId: isEditMode ? post.id : undefined,
        postType: selectedType
      };

      return await postService.createPost(postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      if (isEditMode && post) {
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
      }
      
      toast({
        title: isEditMode ? 'Post updated' : 'Post created',
        description: isEditMode 
          ? 'Your post has been updated successfully!' 
          : 'Your post has been shared successfully!',
      });
      
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} post. Please try again.`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  const isFormValid = selectedType && formData.restaurant && formData.rating > 0 && formData.description.trim().length > 0;

  const getTypeSpecificFields = () => {
    if (!selectedType) return null;

    switch (selectedType) {
      case PostType.DISH:
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="dishName">Dish Name *</Label>
              <Input
                id="dishName"
                placeholder="What dish are you reviewing?"
                value={formData.dishName || ''}
                onChange={(e) => updateFormData({ dishName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category || ''} onValueChange={(value) => updateFormData({ category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appetizer">Appetizer</SelectItem>
                  <SelectItem value="main">Main Course</SelectItem>
                  <SelectItem value="dessert">Dessert</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
                  <SelectItem value="side">Side Dish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      
      case PostType.RESTAURANT:
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="atmosphere">Atmosphere</Label>
              <Select value={formData.atmosphere || ''} onValueChange={(value) => updateFormData({ atmosphere: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="How's the vibe?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="upscale">Upscale</SelectItem>
                  <SelectItem value="romantic">Romantic</SelectItem>
                  <SelectItem value="family">Family-friendly</SelectItem>
                  <SelectItem value="lively">Lively</SelectItem>
                  <SelectItem value="quiet">Quiet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Would you return?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.wouldReturn === true ? "default" : "outline"}
                  onClick={() => updateFormData({ wouldReturn: true })}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={formData.wouldReturn === false ? "default" : "outline"}
                  onClick={() => updateFormData({ wouldReturn: false })}
                >
                  No
                </Button>
              </div>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const getIcon = (type: PostType) => {
    switch (type) {
      case PostType.MOMENT:
        return <Camera className="w-5 h-5" />;
      case PostType.DISH:
        return <UtensilsCrossed className="w-5 h-5" />;
      case PostType.RESTAURANT:
        return <Building className="w-5 h-5" />;
      default:
        return <Camera className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === 'form' && !isEditMode && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {isEditMode ? 'Edit Post' : step === 'type' ? 'What do you want to share?' : 'Create Your Post'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === 'type' && !isEditMode ? (
          <div className="space-y-4">
            <div className="grid gap-3">
              {POST_TYPE_OPTIONS.map((option) => (
                <div
                  key={option.type}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTypeSelect(option.type)}
                >
                  <div className={`p-2 rounded-lg ${option.color} text-white`}>
                    {getIcon(option.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{option.emoji}</span>
                      <h3 className="font-semibold">{option.title}</h3>
                      {option.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {option.features.map((feature, index) => (
                        <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {selectedType && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <div className={`p-1 rounded ${POST_TYPE_OPTIONS.find(opt => opt.type === selectedType)?.color} text-white`}>
                  {getIcon(selectedType)}
                </div>
                <span className="text-sm font-medium">
                  {POST_TYPE_OPTIONS.find(opt => opt.type === selectedType)?.title}
                </span>
              </div>
            )}

            {/* Restaurant Search */}
            <div className="space-y-2">
              <Label>Restaurant *</Label>
              <RestaurantSearchComponent
                onSelect={(restaurant) => updateFormData({ restaurant })}
                placeholder="Search for a restaurant..."
                initialValue={formData.restaurant?.name || ''}
                showRecentSearches={true}
              />
              {formData.restaurant && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{formData.restaurant.name}</p>
                    {formData.restaurant.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {formData.restaurant.location}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFormData({ restaurant: null })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateFormData({ rating: star })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        star <= formData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-400'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm text-gray-500 ml-2">
                  {formData.rating > 0 ? `${formData.rating} star${formData.rating > 1 ? 's' : ''}` : 'No rating'}
                </span>
              </div>
            </div>

            {/* Type-specific fields */}
            {getTypeSpecificFields()}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {selectedType === PostType.DISH ? 'Your review' : 'Description'} *
              </Label>
              <Textarea
                id="description"
                placeholder={
                  selectedType === PostType.DISH 
                    ? "What did you think of this dish? How did it taste?"
                    : selectedType === PostType.RESTAURANT
                    ? "Why do you recommend this restaurant? What makes it special?"
                    : "Tell us about your dining experience..."
                }
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                className="min-h-[100px]"
                required
              />
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Photos & Videos</Label>
              <MediaUploader 
                onChange={(media) => updateFormData({ media })}
                onTagsChange={(tags) => updateFormData({ tags })}
              />
            </div>

            {/* Visibility Settings */}
            <VisibilitySelector
              value={formData.visibilitySettings}
              onChange={(visibilitySettings) => updateFormData({ visibilitySettings })}
              className="space-y-2"
            />

            {/* List Tagging */}
            <div className="space-y-2">
              <Label>Add to list(s) (optional)</Label>
              <MultiSelect
                options={userLists.map(list => ({ id: list.id, name: list.name }))}
                selected={formData.taggedListIds}
                onChange={(taggedListIds) => updateFormData({ taggedListIds })}
                placeholder="Select lists to tag this post..."
                emptyMessage="You have no lists"
                emptyAction={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateListOpen(true)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create one now
                  </Button>
                }
              />
            </div>

            {/* Form Validation Message */}
            {!isFormValid && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                Please complete all required fields: restaurant, rating, and description.
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={submitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || submitMutation.isPending}
                className="flex-1"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Sharing...'}
                  </>
                ) : (
                  isEditMode ? 'Update Post' : 'Share Post'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
      
      {/* Create List Modal */}
      <CreateListModal
        open={isCreateListOpen}
        onOpenChange={setIsCreateListOpen}
        onSuccess={(newList) => {
          queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
          updateFormData({ taggedListIds: [...formData.taggedListIds, (newList as any).id] });
        }}
      />
    </Dialog>
  );
}