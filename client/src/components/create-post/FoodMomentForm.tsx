
<old_str>import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Camera, MapPin, Hash } from 'lucide-react';
import { TagSelector } from '../post/TagSelector';
import { ShareDestinationPicker } from '../post/ShareDestinationPicker';
import { MediaUploader } from '../MediaUploader';

interface FoodMomentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function FoodMomentForm({ onSubmit, onCancel }: FoodMomentFormProps) {
  const [formData, setFormData] = useState({
    image: null as File | null,
    caption: '',
    tags: [] as string[],
    shareDestination: 'public' as string
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Image is required for food moments
    if (!formData.image) {
      newErrors.image = 'Photo is required for food moments';
    }
    
    if (!formData.caption?.trim()) {
      newErrors.caption = 'Caption is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      postType: 'moment',
      content: formData.caption,
      images: formData.image ? [formData.image] : [],
      tags: formData.tags,
      visibility: formData.shareDestination,
      metadata: {
        type: 'food_moment'
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Food Moment
        </CardTitle>
        <p className="text-sm text-gray-600">
          Share what you're eating right now
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Photo <span className="text-red-500">*</span>
            </label>
            <MediaUploader
              onUpload={(file) => setFormData({ ...formData, image: file })}
              maxFiles={1}
              acceptedTypes={['image/*']}
            />
            {errors.image && (
              <p className="text-sm text-red-500">{errors.image}</p>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Caption <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="What's delicious about this moment?"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              className="min-h-[100px]"
            />
            {errors.caption && (
              <p className="text-sm text-red-500">{errors.caption}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Tags (optional)
            </label>
            <TagSelector
              selectedTags={formData.tags}
              onTagsChange={(tags) => setFormData({ ...formData, tags })}
              placeholder="Add tags like #lunch #italian #amazing"
            />
          </div>

          {/* Share Destination */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Destination</label>
            <ShareDestinationPicker
              value={formData.shareDestination}
              onChange={(destination) => setFormData({ ...formData, shareDestination: destination })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Share Moment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}</old_str>
<new_str>import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Camera, MapPin, Hash } from 'lucide-react';
import { TagSelector } from '../post/TagSelector';
import { ShareDestinationPicker } from '../post/ShareDestinationPicker';
import { MediaUploader } from '../MediaUploader';

interface FoodMomentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function FoodMomentForm({ onSubmit, onCancel }: FoodMomentFormProps) {
  const [formData, setFormData] = useState({
    image: null as File | null,
    caption: '',
    tags: [] as string[],
    shareDestination: 'public' as string
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Updated validation: Image OR caption required (not both)
    if (!formData.image && !formData.caption?.trim()) {
      newErrors.general = 'Please add either a photo or caption (or both)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      postType: 'moment',
      content: formData.caption,
      images: formData.image ? [formData.image] : [],
      tags: formData.tags,
      visibility: formData.shareDestination,
      metadata: {
        type: 'food_moment'
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Food Moment
        </CardTitle>
        <p className="text-sm text-gray-600">
          Quick snapshot of what you're eating now
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Photo Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Image (optional)
            </label>
            <MediaUploader
              onUpload={(file) => setFormData({ ...formData, image: file })}
              maxFiles={1}
              acceptedTypes={['image/*']}
            />
            <p className="text-xs text-gray-500">
              Add a photo of your food (optional)
            </p>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Caption
            </label>
            <Textarea
              placeholder="What's delicious about this moment?"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">
              Share your thoughts even without a photo
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Tags (optional)
            </label>
            <TagSelector
              selectedTags={formData.tags}
              onTagsChange={(tags) => setFormData({ ...formData, tags })}
              placeholder="Add tags like #lunch #italian #amazing"
            />
          </div>

          {/* Share Destination */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Destination</label>
            <ShareDestinationPicker
              value={formData.shareDestination}
              onChange={(destination) => setFormData({ ...formData, shareDestination: destination })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Share Moment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}</new_str>
