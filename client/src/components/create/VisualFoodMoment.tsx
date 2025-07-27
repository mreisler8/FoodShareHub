import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Image as ImageIcon, 
  X, 
  MapPin, 
  Sparkles, 
  Heart,
  Coffee,
  UtensilsCrossed,
  PartyPopper,
  Filter,
  Type,
  Circle,
  Square,
  Zap
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocationService } from '@/hooks/useLocationService';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import { RestaurantSearchInput } from '../search/RestaurantSearchInput';

interface VisualFoodMomentProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialVisibility?: 'public' | 'circle' | 'private';
  contextData?: {
    restaurant?: any;
    location?: any;
    initialCaption?: string;
  };
}

interface FilterOption {
  id: string;
  name: string;
  filter: string;
  preview: string;
}

interface QuickTag {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const FILTERS: FilterOption[] = [
  { id: 'none', name: 'Original', filter: 'none', preview: 'brightness(1)' },
  { id: 'vibrant', name: 'Vibrant', filter: 'saturate(1.4) contrast(1.1)', preview: 'saturate(1.4) contrast(1.1)' },
  { id: 'warm', name: 'Warm', filter: 'sepia(0.3) saturate(1.2)', preview: 'sepia(0.3) saturate(1.2)' },
  { id: 'cool', name: 'Cool', filter: 'hue-rotate(10deg) saturate(1.1)', preview: 'hue-rotate(10deg) saturate(1.1)' },
  { id: 'retro', name: 'Retro', filter: 'sepia(0.5) contrast(1.2) brightness(1.1)', preview: 'sepia(0.5) contrast(1.2) brightness(1.1)' },
  { id: 'crisp', name: 'Crisp', filter: 'contrast(1.3) brightness(1.05)', preview: 'contrast(1.3) brightness(1.05)' }
];

const QUICK_TAGS: QuickTag[] = [
  { id: 'celebrating', label: 'Celebrating', icon: PartyPopper, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'trying', label: 'Trying', icon: UtensilsCrossed, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'craving', label: 'Craving', icon: Heart, color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'coffee', label: 'Coffee Time', icon: Coffee, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'amazing', label: 'Amazing', icon: Sparkles, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'energy', label: 'Energy', icon: Zap, color: 'bg-green-100 text-green-700 border-green-200' }
];

const PRIVACY_OPTIONS = [
  { id: 'public', label: '🌍 Public', description: 'Anyone can see' },
  { id: 'circle', label: '👥 Circle', description: 'Only your circles' },
  { id: 'private', label: '🔒 Private', description: 'Only you' }
];

export function VisualFoodMoment({ onSuccess, onCancel, initialVisibility = 'public', contextData }: VisualFoodMomentProps) {
  // Core state
  const [step, setStep] = useState<'capture' | 'enhance' | 'tag' | 'share'>('capture');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>(FILTERS[0]);
  const [textOverlay, setTextOverlay] = useState('');
  const [caption, setCaption] = useState(contextData?.initialCaption || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [privacy, setPrivacy] = useState<'public' | 'circle' | 'private'>(initialVisibility);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs and hooks
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { location, requestLocation, isLocationLoading } = useLocationService();
  const { trackComponent, cleanupComponent } = useMemoryManagement();

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Component lifecycle
  useEffect(() => {
    trackComponent('VisualFoodMoment');
    return () => {
      imagePreviews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
      cleanupComponent('VisualFoodMoment');
    };
  }, [trackComponent, cleanupComponent, imagePreviews]);

  // Image processing
  const processImages = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const validImages = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size < 10 * 1024 * 1024
    ).slice(0, 4); // Max 4 images

    if (validImages.length === 0) {
      toast({
        title: 'Invalid files',
        description: 'Please select valid image files under 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create compressed versions and previews
      const processedImages: File[] = [];
      const previews: string[] = [];

      for (const file of validImages) {
        // Compress image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = new Image();

        await new Promise<void>((resolve) => {
          img.onload = () => {
            const maxSize = 1200;
            const ratio = Math.min(maxSize / img.width, maxSize / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                processedImages.push(compressedFile);
                previews.push(URL.createObjectURL(blob));
              }
              resolve();
            }, 'image/jpeg', 0.85);
          };
          img.src = URL.createObjectURL(file);
        });
      }

      setSelectedImages(processedImages);
      setImagePreviews(previews);

      if (processedImages.length > 0) {
        setStep('enhance');
      }
    } catch (error) {
      toast({
        title: 'Processing failed',
        description: 'Could not process your images. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Submit mutation
  const createMomentMutation = useMutation({
    mutationFn: async (data: {
      images: File[];
      filter: string;
      textOverlay: string;
      tags: string[];
      restaurant: any;
      privacy: string;
      location: any;
    }) => {
      const formData = new FormData();
      formData.append('caption', data.textOverlay);
      formData.append('privacy', data.privacy);

      if (data.location) {
        formData.append('location', JSON.stringify(data.location));
      }

      if (data.restaurant) {
        formData.append('restaurantId', data.restaurant.id);
      }

      // Add metadata
      const metadata = {
        captureType: 'gallery',
        filters: [data.filter],
        textOverlay: data.textOverlay,
        quickTags: data.tags,
        location: data.location,
        isQuickShare: true
      };
      formData.append('metadata', JSON.stringify(metadata));

      data.images.forEach((image) => {
        formData.append('images', image);
      });

      return apiRequest('/api/moments', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/moments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-feed'] });

      toast({
        title: 'Moment shared! ✨',
        description: 'Your food moment is now live.',
      });

      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to share',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

    // Camera Capture Function
    const capturePhoto = async () => {
      setIsProcessing(true);
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const track = stream.getVideoTracks()[0];
          const imageCapture = new ImageCapture(track);
          const blob = await imageCapture.takePhoto();

          // Process the captured photo as a File object
          const capturedImageFile = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
          
          // Manually create a FileList and pass it to processImages
          const fileList = {
              0: capturedImageFile,
              length: 1,
              item: (index: number) => (index === 0 ? capturedImageFile : null),
              [Symbol.iterator]: function* () {
                  yield capturedImageFile;
              }
          } as unknown as FileList;

          await processImages(fileList);

          // Stop the camera stream
          track.stop();
          stream.getTracks().forEach(track => track.stop());
      } catch (error: any) {
          toast({
              title: 'Camera error',
              description: error.message || 'Could not access camera.',
              variant: 'destructive',
          });
      } finally {
          setIsProcessing(false);
      }
  };


  const handleSubmit = useCallback(() => {
    if (selectedImages.length === 0) {
      toast({
        title: 'No images selected',
        description: 'Please select at least one image to share.',
        variant: 'destructive',
      });
      return;
    }

    createMomentMutation.mutate({
      images: selectedImages,
      filter: selectedFilter.filter,
      textOverlay,
      tags: selectedTags,
      restaurant: selectedRestaurant,
      privacy,
      location
    });
  }, [selectedImages, selectedFilter, textOverlay, selectedTags, selectedRestaurant, privacy, location, createMomentMutation]);

  // Step navigation
  const nextStep = () => {
    if (step === 'capture' && selectedImages.length > 0) setStep('enhance');
    else if (step === 'enhance') setStep('tag');
    else if (step === 'tag') setStep('share');
  };

  const prevStep = () => {
    if (step === 'share') setStep('tag');
    else if (step === 'tag') setStep('enhance');
    else if (step === 'enhance') setStep('capture');
  };

  // Render steps
  const renderCaptureStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Capture the moment</h2>
        <p className="text-gray-600">Share your food experience visually</p>
      </div>

      {/* Enhanced Image Upload/Capture with Progress */}
      {selectedImages.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300 hover:border-orange-400 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className={`bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  <Camera className="h-5 w-5" />
                  {isProcessing ? 'Capturing...' : 'Take Photo'}
                </Button>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  disabled={isProcessing}
                  className={`gap-2 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  <ImageIcon className="h-5 w-5" />
                  Choose Photo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={(e) => processImages(e.target.files)}
                className="hidden"
              />
              {isProcessing ? (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                  <p className="text-sm text-orange-600 font-medium">Processing your photo...</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  📸 Take a photo or choose from your gallery
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative group aspect-square">
              <img 
                src={preview} 
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
                style={{ filter: selectedFilter.preview }}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setSelectedImages(prev => prev.filter((_, i) => i !== index));
                  setImagePreviews(prev => prev.filter((_, i) => i !== index));
                }}
                className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {selectedImages.length < 4 && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-gray-300 hover:border-primary/50"
            >
              <div className="text-center">
                <ImageIcon className="h-6 w-6 mx-auto mb-2" />
                <span className="text-sm">Add More</span>
              </div>
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => processImages(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => processImages(e.target.files)}
        className="hidden"
      />
    </div>
  );

  const renderEnhanceStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Enhance your moment</h2>
        <p className="text-gray-600">Add filters and text</p>
      </div>

      {/* Image preview with current filter */}
      <div className="relative">
        <img 
          src={imagePreviews[0]} 
          alt="Preview"
          className="w-full aspect-square object-cover rounded-lg"
          style={{ filter: selectedFilter.preview }}
        />

        {/* Text overlay */}
        {textOverlay && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/50 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
              {textOverlay}
            </div>
          </div>
        )}
      </div>

      {/* Filter selection */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </h3>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {FILTERS.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilter.id === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter)}
              className="whitespace-nowrap"
            >
              {filter.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Text overlay input */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <Type className="h-4 w-4" />
          Text Overlay (Optional)
        </h3>
        <textarea
          value={textOverlay}
          onChange={(e) => setTextOverlay(e.target.value)}
          placeholder="Add text to your moment..."
          className="w-full p-3 border rounded-lg resize-none"
          rows={2}
          maxLength={50}
        />
        <p className="text-xs text-gray-500">{50 - textOverlay.length} characters left</p>
      </div>
    </div>
  );

  const renderTagStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Tag your moment</h2>
        <p className="text-gray-600">Help others discover your experience</p>
      </div>

      {/* Restaurant search */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Restaurant (Optional)
        </h3>
        <RestaurantSearchInput
          onSelect={setSelectedRestaurant}
          selectedRestaurant={selectedRestaurant}
          placeholder="Search for a restaurant..."
        />
      </div>

      {/* Quick tags */}
      <div className="space-y-3">
        <h3 className="font-medium">Quick Tags</h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => {
            const Icon = tag.icon;
            const isSelected = selectedTags.includes(tag.id);
            return (
              <Badge
                key={tag.id}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${isSelected ? '' : tag.color}`}
                onClick={() => {
                  if (isSelected) {
                    setSelectedTags(prev => prev.filter(t => t !== tag.id));
                  } else if (selectedTags.length < 3) {
                    setSelectedTags(prev => [...prev, tag.id]);
                  }
                }}
              >
                <Icon className="h-3 w-3 mr-1" />
                {tag.label}
              </Badge>
            );
          })}
        </div>
        <p className="text-xs text-gray-500">Select up to 3 tags</p>
      </div>
    </div>
  );

  const renderShareStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Share your moment</h2>
        <p className="text-gray-600">Choose who can see this</p>
      </div>

      {/* Final preview */}
      <div className="relative">
        <img 
          src={imagePreviews[0]} 
          alt="Final preview"
          className="w-full aspect-square object-cover rounded-lg"
          style={{ filter: selectedFilter.preview }}
        />

        {textOverlay && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/50 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
              {textOverlay}
            </div>
          </div>
        )}

        {/* Tags overlay */}
        {selectedTags.length > 0 && (
          <div className="absolute top-4 left-4 right-4">
            <div className="flex flex-wrap gap-1">
              {selectedTags.map(tagId => {
                const tag = QUICK_TAGS.find(t => t.id === tagId);
                if (!tag) return null;
                const Icon = tag.icon;
                return (
                  <Badge key={tagId} variant="secondary" className="text-xs">
                    <Icon className="h-3 w-3 mr-1" />
                    {tag.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Restaurant info */}
      {selectedRestaurant && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{selectedRestaurant.name}</p>
                <p className="text-sm text-gray-600">{selectedRestaurant.location}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy selection */}
      <div className="space-y-3">
        <h3 className="font-medium">Privacy</h3>
        <div className="space-y-2">
          {PRIVACY_OPTIONS.map((option) => (
            <Button
              key={option.id}
              variant={privacy === option.id ? "default" : "outline"}
              onClick={() => setPrivacy(option.id as 'public' | 'circle' | 'private')}
              className="w-full justify-start"
            >
              <div className="text-left">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs opacity-75">{option.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'capture': return renderCaptureStep();
      case 'enhance': return renderEnhanceStep();
      case 'tag': return renderTagStep();
      case 'share': return renderShareStep();
      default: return renderCaptureStep();
    }
  };

  const canProceed = () => {
    if (step === 'capture') return selectedImages.length > 0;
    return true;
  };

  const isLastStep = step === 'share';

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-2">
        {['capture', 'enhance', 'tag', 'share'].map((stepName, index) => {
          const isActive = step === stepName;
          const isCompleted = ['capture', 'enhance', 'tag', 'share'].indexOf(step) > index;
          return (
            <div
              key={stepName}
              className={`w-2 h-2 rounded-full transition-colors ${
                isActive ? 'bg-primary' : isCompleted ? 'bg-primary/50' : 'bg-gray-300'
              }`}
            />
          );
        })}
      </div>

      {/* Current step content */}
      <div className="min-h-[400px]">
        {renderCurrentStep()}
      </div>

      {/* Navigation buttons */}
      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={step === 'capture' ? onCancel : prevStep}
          className="flex-1"
        >
          {step === 'capture' ? 'Cancel' : 'Back'}
        </Button>

        {isLastStep ? (
          <Button
            onClick={handleSubmit}
            disabled={createMomentMutation.isPending || !canProceed()}
            className="flex-1"
          >
            {createMomentMutation.isPending ? 'Sharing...' : 'Share Moment'}
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}