import React, { useState, useRef } from 'react';
import { Camera, MapPin, Hash, Star, Upload, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { RestaurantSearchInput } from '../search/RestaurantSearchInput';

interface VisualFoodMomentProps {
  onSubmit: (momentData: any) => void;
  onCancel: () => void;
  initialImage?: string;
}

interface Restaurant {
  id: string;
  name: string;
  location: string;
  category?: string;
}

export default function VisualFoodMoment({ onSubmit, onCancel, initialImage }: VisualFoodMomentProps) {
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'photo' | 'details'>('photo');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setCurrentStep('details');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    const momentData = {
      image,
      restaurant: selectedRestaurant,
      dishName: dishName.trim(),
      description: description.trim(),
      rating,
      tags,
      type: 'food_moment'
    };

    onSubmit(momentData);
  };

  const canSubmit = image && selectedRestaurant && dishName.trim();

  if (currentStep === 'photo') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">Food Moment</h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {image ? (
            <div className="relative">
              <img 
                src={image} 
                alt="Food moment" 
                className="w-80 h-80 object-cover rounded-lg shadow-lg"
              />
              <Button
                onClick={() => setCurrentStep('details')}
                className="mt-6 w-full"
                size="lg"
              >
                Continue to Details
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-orange-600" />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">Capture Your Food Moment</h2>
                <p className="text-gray-600 mb-6">
                  Share a photo of your dish and tell others about your experience
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  size="lg"
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-5 h-5 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mr-2" />
                      Take Photo / Upload
                    </>
                  )}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  capture="environment"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCurrentStep('photo')}>
          ← Back
        </Button>
        <h1 className="font-semibold text-lg">Add Details</h1>
        <Button 
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant={canSubmit ? "default" : "ghost"}
          size="sm"
        >
          Share
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white px-4 py-2 border-b">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Check className="w-4 h-4 text-green-500" />
          <span>Photo Added</span>
          <div className="w-2 h-0.5 bg-gray-300"></div>
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
          <Card className="border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="w-5 h-5 text-orange-600" />
                <label className="font-medium text-gray-900">
                  Where did you eat this? *
                </label>
              </div>

              <RestaurantSearchInput
                value={selectedRestaurant?.name || ''}
                onChange={(restaurant) => setSelectedRestaurant(restaurant)}
                placeholder="Search restaurants..."
                className="w-full"
              />

              {selectedRestaurant && (
                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                  <div className="font-medium">{selectedRestaurant.name}</div>
                  <div className="text-sm text-gray-600">{selectedRestaurant.location}</div>
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
              className="w-full"
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
                  ClassName="p-1"
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
              placeholder="What made this special? How was the service? Would you recommend it?"
              rows={3}
              className="w-full"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Tags (optional)
            </label>
            <div className="flex space-x-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tags like 'spicy', 'date night'..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button onClick={addTag} variant="outline" size="sm">
                <Hash className="w-4 h-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Requirements Notice */}
          {!canSubmit && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-orange-800 text-sm">
                <strong>Required:</strong> Please add a restaurant and dish name to share your moment
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}