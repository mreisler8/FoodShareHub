import React, { useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Camera, Image, X, MapPin, Users, Globe, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface InstagramFoodMomentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstagramFoodMomentModal({ isOpen, onClose }: InstagramFoodMomentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'circle' | 'private'>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const createMomentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest('/api/moments', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Food moment shared! 📸",
        description: "Your food moment has been shared successfully.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share food moment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setSelectedFile(file);
        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image or video file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      toast({
        title: "Photo required",
        description: "Please select a photo or video to share.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('photo', selectedFile);
    formData.append('caption', caption);
    formData.append('location', location);
    formData.append('privacy', privacy);

    createMomentMutation.mutate(formData);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setLocation('');
    setPrivacy('public');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full h-[95vh] p-0 gap-0 flex flex-col bg-white border-0 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white">
            <h2 className="text-lg font-semibold text-gray-900">Share Food Moment</h2>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Photo/Video Upload Section */}
            <div className="p-4">
              {!preview ? (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                  <div className="space-y-4">
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={handleCameraCapture}
                        variant="outline"
                        className="flex flex-col items-center p-6 h-20 w-20"
                      >
                        <Camera className="h-6 w-6 mb-1" />
                        <span className="text-xs">Camera</span>
                      </Button>
                      <Button
                        onClick={handleGallerySelect}
                        variant="outline"
                        className="flex flex-col items-center p-6 h-20 w-20"
                      >
                        <Image className="h-6 w-6 mb-1" />
                        <span className="text-xs">Gallery</span>
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">Take a photo or choose from your gallery</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {selectedFile?.type.startsWith('video/') ? (
                      <video
                        src={preview}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Caption and Details */}
            <div className="p-4 space-y-4">
              <div>
                <Textarea
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="border-0 resize-none focus:ring-0 text-base p-0"
                  rows={3}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Add location</span>
                </div>
                <Input
                  placeholder="Where was this taken?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border-0 border-b rounded-none focus:ring-0 px-0"
                />
              </div>

              {/* Privacy Settings */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Who can see this?</p>
                <div className="flex gap-2">
                  <Button
                    variant={privacy === 'public' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPrivacy('public')}
                    className="flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Public
                  </Button>
                  <Button
                    variant={privacy === 'circle' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPrivacy('circle')}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Circle
                  </Button>
                  <Button
                    variant={privacy === 'private' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPrivacy('private')}
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Private
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="flex-shrink-0 p-4 border-t bg-white">
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || createMomentMutation.isPending}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {createMomentMutation.isPending ? 'Sharing...' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}