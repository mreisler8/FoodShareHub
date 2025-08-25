import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, X, Star, MapPin, ArrowLeft, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface VisualFoodMomentProps {
  onSubmit?: (data: any) => void;
  onCancel: () => void;
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
  // CRITICAL: Photo-first state management
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'photo' | 'details'>(initialImage ? 'details' : 'photo');
  
  // Form state - only accessible after photo
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Camera and refs
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
  
  // MOBILE VIEWPORT OPTIMIZATION for 503x559px
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth <= 520 && window.innerHeight <= 580);
    };
    
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Restaurant search state
  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Photo upload handler
  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
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
      if (file.size > 10 * 1024 * 1024) {
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

  // Camera functionality
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
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

  // Restaurant search
  const searchRestaurants = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.restaurants || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchRestaurants(restaurantQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [restaurantQuery]);

  // Tag management
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Submit functionality
  const handleSubmit = async () => {
    if (!canSubmit || !imageFile) return;

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('restaurantId', selectedRestaurant?.id || '');
      formData.append('dishName', dishName);
      formData.append('content', description);
      formData.append('rating', rating.toString());
      formData.append('tags', JSON.stringify(tags));

      console.log('Submitting Food Moment:', {
        restaurantId: selectedRestaurant?.id,
        dishName,
        hasImage: Boolean(imageFile),
        rating,
        tags
      });

      const response = await fetch('/api/moments', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        throw new Error(error.error || 'Failed to create moment');
      }

      const result = await response.json();
      console.log('Food Moment Created:', result);
      
      // Invalidate feed cache to show new moment
      queryClient.invalidateQueries({ queryKey: ['/api/feed/unified'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      toast({
        title: "Food moment shared!",
        description: "Your photo-first moment has been added to the feed",
      });

      if (onSuccess) onSuccess();
      if (onSubmit) onSubmit(result.moment);

    } catch (error) {
      console.error('Submit failed:', error);
      toast({
        title: "Share failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBackToPhoto = () => {
    setCurrentStep('photo');
    setImage(null);
    setImageFile(null);
    stopCamera();
  };

  // PHOTO CAPTURE STEP - MANDATORY FIRST STEP
  if (currentStep === 'photo') {
    return (
      <div className="h-screen flex flex-col bg-black" style={{ 
        height: isMobileViewport ? '100dvh' : '100vh',
        maxWidth: isMobileViewport ? '503px' : 'none',
        margin: isMobileViewport ? '0 auto' : 'auto'
      }}>
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
                className="w-full h-auto rounded-lg"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <Button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500"></div>
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <div className="w-full max-w-md space-y-6">
              {/* Camera Button - 44px minimum touch target */}
              <Button
                onClick={startCamera}
                className="w-full h-32 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg font-medium rounded-lg flex flex-col items-center justify-center space-y-2 touch-target-large"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Camera className="w-12 h-12" />
                <span>Take Photo Now</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-black text-white/60">or</span>
                </div>
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
                className="w-full h-20 bg-white/10 hover:bg-white/20 text-white border-white/30 text-lg font-medium rounded-lg flex items-center justify-center space-x-3 touch-target-large"
                disabled={isUploading}
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span>Choose from Gallery</span>
                  </>
                )}
              </Button>

              <div className="text-center mt-6">
                <p className="text-white/80 text-lg font-medium mb-2">
                  📸 Photo Required
                </p>
                <p className="text-white/60 text-sm">
                  You must capture or upload a photo to continue
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DETAILS STEP - Only accessible after photo is captured/uploaded
  return (
    <div className="h-screen flex flex-col bg-gray-50" style={{ 
      height: isMobileViewport ? '100dvh' : '100vh',
      maxWidth: isMobileViewport ? '503px' : 'none',
      margin: isMobileViewport ? '0 auto' : 'auto'
    }}>
      {/* Header with Back Button */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <Button variant="ghost" size="sm" onClick={goBackToPhoto}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold text-lg">Add Details</h2>
        <div className="w-10"></div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Photo Preview */}
          {image && (
            <div className="relative">
              <img 
                src={image} 
                alt="Food moment" 
                className="w-full h-48 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2">
                <div className="bg-green-500 text-white p-1 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}

          {/* Restaurant Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Restaurant *
            </label>
            <div className="relative">
              <Input
                value={restaurantQuery}
                onChange={(e) => setRestaurantQuery(e.target.value)}
                placeholder="Search for restaurant..."
                className="w-full"
              />
              <MapPin className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-white border rounded-lg shadow-sm max-h-40 overflow-y-auto">
                {searchResults.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => {
                      setSelectedRestaurant(restaurant);
                      setRestaurantQuery(restaurant.name);
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="font-medium">{restaurant.name}</div>
                    <div className="text-sm text-gray-600">{restaurant.location || 'Location not specified'}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Restaurant */}
            {selectedRestaurant && (
              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-600" />
                <div>
                  <div className="font-medium">{selectedRestaurant.name}</div>
                  <div className="text-sm text-gray-600">{selectedRestaurant.location || 'Location not specified'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Dish Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Dish Name *
            </label>
            <Input
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="What did you eat?"
              className="w-full"
            />
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Rating (Optional)
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 touch-target"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about this dish..."
              className="w-full h-20 resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Tags (Optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center space-x-1"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button onClick={addTag} size="sm">
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Submit Button */}
      <div className="bg-white border-t p-4">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-lg font-medium touch-target-large"
          style={{ minHeight: '48px' }}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            'Share Food Moment'
          )}
        </Button>
        
        {!canSubmit && (
          <div className="text-center mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 font-medium">
              📝 Required Fields Missing
            </p>
            <p className="text-xs text-red-600 mt-1">
              {!selectedRestaurant && "• Restaurant selection required"}
              {selectedRestaurant && !dishName.trim() && "• Dish name required"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Add CSS for mobile optimization and touch targets
const styles = `
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.touch-target-large {
  min-height: 48px;
  min-width: 48px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
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
  
  .touch-target-large {
    min-height: 52px;
    min-width: 52px;
  }
  
  /* Optimize for mobile viewport */
  body {
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
  }
  
  /* Fast tap response */
  button, [role="button"] {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
}

/* Performance optimizations */
* {
  box-sizing: border-box;
}

img, video {
  max-width: 100%;
  height: auto;
}
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('visual-food-moment-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'visual-food-moment-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}