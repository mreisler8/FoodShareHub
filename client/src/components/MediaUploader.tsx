import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import axios from 'axios';
import { MediaTagger } from './MediaTagger';
import { ChevronDown, Filter, X, Check } from 'lucide-react';

interface MediaFile {
  url: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  tags?: string[];
  filter?: string;
}

interface MediaUploaderProps {
  onChange: (files: MediaFile[]) => void;
  onTagsChange?: (imageTags: string[]) => void;
}

const IMAGE_FILTERS = [
  { id: 'none', name: 'None', css: '' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.5) contrast(1.2) brightness(1.1)' },
  { id: 'retro', name: 'Retro', css: 'sepia(0.5) saturate(1.2) contrast(1.1) hue-rotate(15deg)' },
  { id: 'mono', name: 'Mono', css: 'grayscale(1) contrast(1.1)' },
];

const DEFAULT_TAGS = [
  'delicious', 'amazing', 'perfect', 'fresh', 'homemade', 'spicy', 'sweet', 'healthy',
  'comfort-food', 'instagram-worthy', 'must-try', 'seasonal', 'authentic', 'fusion'
];

export default function MediaUploader({ onChange, onTagsChange }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<MediaFile[]>([]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showTagger, setShowTagger] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_TAGS);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleUpload = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Cancel any existing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setUploading(true);
    setError(null);

    try {
      // Process files in chunks to avoid memory issues
      const CHUNK_SIZE = 3;
      const chunks = [];
      for (let i = 0; i < acceptedFiles.length; i += CHUNK_SIZE) {
        chunks.push(acceptedFiles.slice(i, i + CHUNK_SIZE));
      }

      const allUploadedFiles = [];

      for (const chunk of chunks) {
        const formData = new FormData();
        
        for (const file of chunk) {
          if (file.type.startsWith('image/')) {
            formData.append('images', file);
          } else if (file.type.startsWith('video/')) {
            formData.append('videos', file);
          }
        }

        const response = await axios.post('/api/uploads', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: abortControllerRef.current.signal,
          timeout: 30000, // 30 second timeout
        });

        allUploadedFiles.push(...(response.data.files || []));
      }

      const newPreviews = [...previews, ...allUploadedFiles.map(file => ({
        ...file,
        filter: selectedFilter,
        tags: []
      }))];
      setPreviews(newPreviews);
      onChange(newPreviews);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Upload error:', error);
        setError(error.response?.data?.error || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  }, [previews, selectedFilter, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi', '.wmv']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
    disabled: uploading,
    validator: (file) => {
      const imageCount = previews.filter(p => p.type === 'image').length;
      const videoCount = previews.filter(p => p.type === 'video').length;
      
      if (file.type.startsWith('image/') && imageCount >= 10) {
        return { code: 'too-many-images', message: 'Maximum 10 images allowed' };
      }
      if (file.type.startsWith('video/') && videoCount >= 2) {
        return { code: 'too-many-videos', message: 'Maximum 2 videos allowed' };
      }
      return null;
    },
    onDropRejected: (fileRejections) => {
      const errors = fileRejections.map(rejection => 
        rejection.errors.map(err => err.message).join(', ')
      ).join('; ');
      setError(`File rejected: ${errors}`);
    }
  });

  const removeFile = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onChange(newPreviews);
    updateImageTags(newPreviews);
  };

  const applyFilterToFile = (index: number, filterId: string) => {
    const newPreviews = [...previews];
    newPreviews[index] = { ...newPreviews[index], filter: filterId };
    setPreviews(newPreviews);
    onChange(newPreviews);
  };

  const handleTagChange = (index: number, tags: string[]) => {
    const newPreviews = [...previews];
    newPreviews[index] = { ...newPreviews[index], tags };
    setPreviews(newPreviews);
    onChange(newPreviews);
    updateImageTags(newPreviews);
  };

  const handleAddTag = (tag: string) => {
    if (!availableTags.includes(tag)) {
      setAvailableTags([...availableTags, tag]);
    }
  };

  const updateImageTags = (files: MediaFile[]) => {
    const allTags = files.flatMap(file => file.tags || []);
    const uniqueTags = [...new Set(allTags)];
    onTagsChange?.(uniqueTags);
  };

  const getFilterCSS = (filterId: string) => {
    const filter = IMAGE_FILTERS.find(f => f.id === filterId);
    return filter ? filter.css : '';
  };

  const openCropper = (index: number) => {
    if (previews[index].type === 'image') {
      setCropIndex(index);
    }
  };

  const closeCropper = () => {
    setCropIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📸</div>
            <p className="text-gray-600">
              {isDragActive
                ? "Drop files here..."
                : "Drag & drop images/videos, or click to select"}
            </p>
            <p className="text-sm text-gray-500">
              Supports: JPG, PNG, GIF, MP4, MOV (Max 10 images, 2 videos)
            </p>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      {previews.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filter: {IMAGE_FILTERS.find(f => f.id === selectedFilter)?.name}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-full">
                {IMAGE_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => {
                      setSelectedFilter(filter.id);
                      setShowFilterDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <span>{filter.name}</span>
                    {selectedFilter === filter.id && (
                      <Check className="h-4 w-4 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowTagger(!showTagger)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {showTagger ? 'Hide' : 'Show'} Media Tagger
          </button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-600">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Media Previews with Filters */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {previews.map((file, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                {file.type === 'image' ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{ filter: getFilterCSS(file.filter || 'none') }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <div className="text-xs text-gray-500">VIDEO</div>
                  </div>
                )}
              </div>
              
              {/* Remove button */}
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>

              {/* Filter selector for each image */}
              {file.type === 'image' && (
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <select
                    value={file.filter || 'none'}
                    onChange={(e) => applyFilterToFile(index, e.target.value)}
                    className="w-full bg-black bg-opacity-50 text-white text-xs rounded px-2 py-1"
                  >
                    {IMAGE_FILTERS.map(filter => (
                      <option key={filter.id} value={filter.id}>
                        {filter.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tags indicator */}
              {file.tags && file.tags.length > 0 && (
                <div className="absolute top-2 left-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {file.tags.length}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Media Tagger */}
      {showTagger && previews.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <MediaTagger
            mediaFiles={previews}
            availableTags={availableTags}
            onTagChange={handleTagChange}
            onAddTag={handleAddTag}
          />
        </div>
      )}

      {/* Crop Modal */}
      {cropIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Crop Image</h3>
              <button
                onClick={closeCropper}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="relative w-full h-64 bg-gray-100 mb-4">
              <Cropper
                image={previews[cropIndex].url}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="flex items-center space-x-4 mb-4">
              <label className="text-sm font-medium">Zoom:</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeCropper}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={closeCropper}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}