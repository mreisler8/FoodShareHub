import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import axios from 'axios';

interface MediaFile {
  url: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
}

interface MediaUploaderProps {
  onChange: (files: MediaFile[]) => void;
}

export default function MediaUploader({ onChange }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<MediaFile[]>([]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
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
        
        // Optimize file compression before upload
        for (const file of chunk) {
          if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
            // Compress images larger than 1MB
            const compressedFile = await compressImage(file);
            formData.append('images', compressedFile);
          } else if (file.type.startsWith('video')) {
            formData.append('videos', file);
          } else {
            formData.append('images', file);
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

      const newPreviews = [...previews, ...allUploadedFiles];
      setPreviews(newPreviews);
      onChange(newPreviews);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Upload failed:', error);
        setError(error.response?.data?.error || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  }, [previews, onChange]);

  // Image compression utility
  const compressImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let { width, height } = img;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    maxFiles: 12,
    maxSize: 50 * 1024 * 1024, // 50MB limit
    onDrop: handleUpload,
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map(f => f.errors[0]?.message).join(', ');
      setError(`File rejected: ${errors}`);
    }
  });

  const removeFile = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onChange(newPreviews);
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
    <div className="media-uploader">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={uploading} />
        <div className="flex flex-col items-center space-y-2">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg font-medium text-gray-700">
            {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-sm text-gray-500">
            Max 10 images, 2 videos • JPEG, PNG, GIF, MP4, MOV
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-600">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {uploading && (
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Processing files...</span>
            <button
              onClick={() => abortControllerRef.current?.abort()}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Thumbnail previews */}
      {previews.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Uploaded files ({previews.length})
          </h4>
          <div className="flex overflow-x-auto gap-3 pb-2">
            {previews.map((file, index) => (
              <div key={index} className="relative flex-shrink-0 group">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                     onClick={() => openCropper(index)}>
                  {file.type === 'image' ? (
                    <img
                      src={file.thumbnailUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Remove button */}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
                
                {/* Crop button for images */}
                {file.type === 'image' && (
                  <button
                    onClick={() => openCropper(index)}
                    className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Crop image"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crop modal */}
      {cropIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Crop Image</h3>
              <button
                onClick={closeCropper}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                onCropComplete={(croppedArea, croppedAreaPixels) => {
                  // Handle crop completion
                  console.log('Crop completed:', croppedArea, croppedAreaPixels);
                }}
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