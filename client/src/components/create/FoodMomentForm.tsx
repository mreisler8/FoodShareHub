import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, MapPinIcon, X, Upload, Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocationService } from '@/hooks/useLocationService';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';

const foodMomentSchema = z.object({
  caption: z.string().max(140, 'Caption must be 140 characters or less'),
  privacy: z.enum(['public', 'circle', 'private']),
  location: z.object({
    name: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
});

type FoodMomentFormData = z.infer<typeof foodMomentSchema>;

interface FoodMomentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function FoodMomentForm({ onSuccess, onCancel }: FoodMomentFormProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { location, requestLocation, isLocationLoading } = useLocationService();
  const { trackComponent, cleanupComponent } = useMemoryManagement();

  const form = useForm<FoodMomentFormData>({
    resolver: zodResolver(foodMomentSchema),
    defaultValues: {
      caption: '',
      privacy: 'public',
      location: undefined,
    },
  });

  // Image compression utility
  const compressImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate dimensions (max 1200px width)
        const maxWidth = 1200;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Handle image selection
  const handleImageSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    
    const validImages = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size < 10 * 1024 * 1024 // 10MB limit
    );

    if (validImages.length === 0) {
      toast({
        title: 'Invalid files',
        description: 'Please select valid image files under 10MB.',
        variant: 'destructive',
      });
      return;
    }

    // Limit to 4 images max
    const imagesToProcess = validImages.slice(0, 4);
    setIsCompressing(true);

    try {
      // Compress images
      const compressedImages = await Promise.all(
        imagesToProcess.map(file => compressImage(file))
      );
      
      // Create previews
      const previews = await Promise.all(
        compressedImages.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        })
      );

      setSelectedImages(compressedImages);
      setImagePreviews(previews);
    } catch (error) {
      toast({
        title: 'Image processing failed',
        description: 'There was an error processing your images. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCompressing(false);
    }
  }, [compressImage, toast]);

  // Remove image
  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle location request
  const handleLocationRequest = useCallback(async () => {
    const loc = await requestLocation();
    if (loc) {
      form.setValue('location', {
        name: 'Current Location',
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    }
  }, [requestLocation, form]);

  // Submit mutation
  const createMomentMutation = useMutation({
    mutationFn: async (data: FoodMomentFormData & { images: File[] }) => {
      const formData = new FormData();
      formData.append('type', 'moment');
      formData.append('caption', data.caption);
      formData.append('privacy', data.privacy);
      
      if (data.location) {
        formData.append('location', JSON.stringify(data.location));
      }
      
      data.images.forEach((image, index) => {
        formData.append(`images`, image);
      });
      
      return apiRequest('/api/moments', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/moments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discover'] });
      
      toast({
        title: 'Moment shared!',
        description: 'Your food moment has been shared successfully.',
      });
      
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to share moment',
        description: error.message || 'There was an error sharing your moment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = useCallback((data: FoodMomentFormData) => {
    // Allow submission with either caption or images (Epic Phase 1 requirement)
    if (!data.caption.trim() && selectedImages.length === 0) {
      toast({
        title: 'Content required',
        description: 'Please add a caption or at least one photo to your food moment.',
        variant: 'destructive',
      });
      return;
    }

    createMomentMutation.mutate({
      ...data,
      images: selectedImages,
    });
  }, [selectedImages, createMomentMutation, toast]);

  // Component lifecycle and cleanup
  React.useEffect(() => {
    trackComponent('FoodMomentForm');
    
    return () => {
      // Cleanup blob URLs
      imagePreviews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
      cleanupComponent('FoodMomentForm');
    };
  }, [trackComponent, cleanupComponent, imagePreviews]);

  const remainingChars = 140 - form.watch('caption').length;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Image Upload */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Photos *</Label>
        
        {selectedImages.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex justify-center space-x-4 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="min-h-[44px]"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    {isCompressing ? 'Processing...' : 'Upload Photos'}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add up to 4 photos (JPG, PNG, WebP) • Max 10MB each
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img 
                  src={preview} 
                  alt={`Food moment ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            {selectedImages.length < 4 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              >
                <div className="text-center">
                  <Upload className="h-6 w-6 mx-auto mb-2" />
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
          onChange={(e) => handleImageSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="caption" className="text-base font-medium">Caption *</Label>
          <span className={`text-sm ${remainingChars < 0 ? 'text-red-500' : 'text-gray-500'}`}>
            {remainingChars} characters left
          </span>
        </div>
        <Textarea
          id="caption"
          placeholder="Share what made this moment special..."
          {...form.register('caption')}
          className="resize-none min-h-[100px]"
          maxLength={140}
        />
        {form.formState.errors.caption && (
          <p className="text-sm text-red-500">{form.formState.errors.caption.message}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Location (Optional)</Label>
        <Button
          type="button"
          variant="outline"
          onClick={handleLocationRequest}
          disabled={isLocationLoading}
          className="w-full justify-start min-h-[44px]"
        >
          <MapPinIcon className="h-4 w-4 mr-2" />
          {isLocationLoading ? 'Getting location...' : 
           form.watch('location') ? 'Current Location Added' : 'Add Current Location'}
        </Button>
      </div>

      {/* Privacy */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Privacy</Label>
        <Select 
          value={form.watch('privacy')} 
          onValueChange={(value: 'public' | 'circle' | 'private') => form.setValue('privacy', value)}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">🌍 Public - Anyone can see</SelectItem>
            <SelectItem value="circle">👥 Circle - Only your circles</SelectItem>
            <SelectItem value="private">🔒 Private - Only you</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 min-h-[44px]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMomentMutation.isPending || isCompressing || selectedImages.length === 0}
          className="flex-1 min-h-[44px]"
        >
          {createMomentMutation.isPending ? 'Sharing...' : 'Share Moment'}
        </Button>
      </div>
    </form>
  );
}