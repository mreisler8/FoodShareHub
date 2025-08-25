import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    
    // Photo OR caption is required (not both)
    if (!formData.image && !formData.caption?.trim()) {
      newErrors.general = 'Either a photo or caption is required';
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
      image: formData.image,
      tags: formData.tags,
      shareDestination: formData.shareDestination,
      metadata: {
        type: 'food_moment'
      }
    });
  };

  const isSubmitDisabled = !formData.image && !formData.caption?.trim();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Food Moment
        </CardTitle>
        <p className="text-sm text-gray-600">
          Photo OR caption required
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Show general error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}
          
          {/* Photo Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Photo <span className="text-gray-500">(optional)</span>
            </label>
            <MediaUploader
              onUpload={(file) => setFormData({ ...formData, image: file })}
              maxFiles={1}
              acceptedTypes={['image/*']}
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Caption <span className="text-gray-500">(optional)</span>
            </label>
            <Textarea
              placeholder="What's delicious about this moment?"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              className="min-h-[100px]"
            />
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
              disabled={isSubmitDisabled}
              className="flex-1"
            >
              Share Moment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}