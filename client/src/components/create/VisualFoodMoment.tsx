import React, { useState, useRef } from 'react';
import { Camera, MapPin, Hash, Star, Upload, Check, X, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { RestaurantSearchInput } from '../search/RestaurantSearchInput';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface VisualFoodMomentProps {
  onSubmit?: (momentData: any) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
  initialImage?: string;
}

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  cuisine?: string;
  avgRating?: number;
  source?: string;
}

export function VisualFoodMoment({ onSubmit, onCancel, onSuccess, initialImage }: VisualFoodMomentProps) {
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'photo' | 'details'>(initialImage ? 'details' : 'photo');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // CRITICAL: Photo-first enforcement - details step only accessible after photo
  const canProceedToDetails = Boolean(image);
  const canSubmit = canProceedToDetails && selectedRestaurant && dishName.trim();

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setImageFile(file);
        setCurrentStep('details');
        setIsUploading(false);
        toast({
          title: "Photo added!",
          description: "Now add restaurant and dish details",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Please try selecting your photo again",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 10MB",
          variant: "destructive",
        });
        return;
      }
      handleImageUpload(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      toast({
        title: "Camera unavailable",
        description: "Please use the photo upload option instead",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            handleImageUpload(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const submitMoment = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      if (imageFile) {
        formData.append('image', imageFile);
      }
      formData.append('restaurantId', data.restaurant.id);
      formData.append('content', data.description || `${data.dishName} at ${data.restaurant.name}`);
      formData.append('rating', data.rating.toString());
      formData.append('tags', JSON.stringify(data.tags));
      formData.append('dishName', data.dishName);
      
      return apiRequest('/api/moments', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unified-feed'] });
      toast({
        title: "Food moment shared!",
        description: "Your moment has been added to your feed",
      });
      if (onSuccess) {
        onSuccess();
      } else if (onSubmit) {
        onSubmit({});
      }
    },
    onError: (error) => {
      console.error('Submit failed:', error);
      toast({
        title: "Share failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (!canSubmit) return;
    
    const momentData = {
      image,
      restaurant: selectedRestaurant,
      dishName: dishName.trim(),
      description: description.trim(),
      rating,
      tags,
    };

    setIsSubmitting(true);
    submitMoment.mutate(momentData);
  };

  const goBackToPhoto = () => {
    setCurrentStep('photo');
    setImage(null);
    setImageFile(null);
    stopCamera();
  };

  // PHOTO CAPTURE STEP
  if (currentStep === 'photo') {
    return (
      <div className="h-screen flex flex-col bg-black">
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-lg">Add Photo</h2>
          <div className="w-10"></div>
        </div>

        {/* Camera or Upload Interface */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {showCamera ? (
            <div className="relative w-full max-w-md">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <Button
                  onClick={stopCamera}
                  variant="secondary"
                  size="lg"
                  className="bg-white/90 hover:bg-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="bg-white hover:bg-gray-100 text-black w-16 h-16 rounded-full"
                >
                  <Camera className="w-8 h-8" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md space-y-6">
              {/* Camera Button */}
              <Button
                onClick={startCamera}
                className="w-full h-32 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg font-medium rounded-2xl flex flex-col items-center justify-center space-y-2"
              >
                <Camera className="w-12 h-12" />
                <span>Take Photo</span>
              </Button>

              <div className="text-center">
                <p className="text-white/80 mb-4">or</p>
              </div>

              {/* Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full h-20 bg-white/10 hover:bg-white/20 text-white border-white/30 text-lg font-medium rounded-2xl flex items-center justify-center space-x-3"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span>Choose from Gallery</span>
                  </>
                )}
              </Button>

              <p className="text-white/60 text-center text-sm mt-6">
                📸 Share what you're eating right now!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DETAILS STEP - Only accessible after photo
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <Button variant="ghost" size="sm" onClick={goBackToPhoto}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold text-lg">Add Details</h2>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6"
          size="sm"
        >
          {isSubmitting ? 'Sharing...' : 'Share'}
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white px-4 py-2 border-b">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Check className="w-4 h-4 text-green-500" />
          <span>Photo Added</span>
          <div className="w-4 h-0.5 bg-gray-300"></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span className="font-medium">Details</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Photo Preview */}
        <div className="bg-white p-4 border-b">
          <img 
            src={image!} 
            alt="Food moment" 
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>

        <div className="p-4 space-y-6">
          {/* Restaurant Selection - REQUIRED */}
          <Card className={`border-2 ${selectedRestaurant ? 'border-green-200 bg-green-50/50' : 'border-orange-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="w-5 h-5 text-orange-600" />
                <label className="font-medium text-gray-900">
                  Where did you eat this? *
                </label>
              </div>

              <RestaurantSearchInput
                onSelect={(restaurant: Restaurant) => setSelectedRestaurant(restaurant)}
                selectedRestaurant={selectedRestaurant}
                placeholder="Search restaurants..."
                className="w-full"
              />

              {selectedRestaurant && (
                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="font-medium">{selectedRestaurant.name}</div>
                    <div className="text-sm text-gray-600">{selectedRestaurant.location || 'Location not specified'}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dish Name - REQUIRED */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              What dish is this? *
            </label>
            <Input
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="e.g., Margherita Pizza, Chicken Tikka Masala..."
              className={`w-full ${dishName.trim() ? 'border-green-200 bg-green-50/50' : 'border-gray-300'}`}
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block font-medium text-gray-900 mb-3">
              How was it?
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 touch-target"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {rating === 5 ? 'Amazing!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Okay' : 'Not great'}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Tell us more (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What made this special? How did it taste?"
              className="w-full min-h-[80px]"
              maxLength={280}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {description.length}/280
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Add tags (optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="text-sm px-3 py-1 flex items-center space-x-1"
                >
                  <span>#{tag}</span>
                  <button onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add a tag..."
                className="flex-1"
                maxLength={20}
              />
              <Button 
                onClick={addTag} 
                variant="outline" 
                size="sm"
                disabled={!newTag.trim() || tags.length >= 10}
              >
                <Hash className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {tags.length}/10 tags • Try: spicy, date-night, must-try
            </p>
          </div>

          {/* Submit Button for Mobile */}
          <div className="pb-8">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-lg font-medium"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Sharing...</span>
                </div>
              ) : (
                'Share Food Moment'
              )}
            </Button>
            
            {!canSubmit && (
              <p className="text-center text-sm text-red-600 mt-2">
                Please add restaurant and dish name to share
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add CSS for touch targets
const styles = `
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Mobile viewport optimization for 503x559px */
@media (max-width: 520px) and (max-height: 580px) {
  .h-screen {
    height: 100vh;
    height: 100dvh;
  }
  
  .touch-target {
    min-height: 48px;
    min-width: 48px;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}