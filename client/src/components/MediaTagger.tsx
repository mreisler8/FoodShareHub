import React, { useState, useRef } from 'react';
import { X, Tag, Hash } from 'lucide-react';

interface MediaFile {
  url: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  tags?: string[];
}

interface MediaTaggerProps {
  mediaFiles: MediaFile[];
  availableTags: string[];
  onTagChange: (index: number, tags: string[]) => void;
  onAddTag: (tag: string) => void;
}

export function MediaTagger({ mediaFiles, availableTags, onTagChange, onAddTag }: MediaTaggerProps) {
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, tag: string) => {
    setDraggedTag(tag);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', tag);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, mediaIndex: number) => {
    e.preventDefault();
    if (draggedTag) {
      const currentTags = mediaFiles[mediaIndex].tags || [];
      if (!currentTags.includes(draggedTag)) {
        onTagChange(mediaIndex, [...currentTags, draggedTag]);
      }
      setDraggedTag(null);
    }
  };

  const handleRemoveTag = (mediaIndex: number, tagToRemove: string) => {
    const currentTags = mediaFiles[mediaIndex].tags || [];
    onTagChange(mediaIndex, currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddNewTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      onAddTag(newTag.trim());
      setNewTag('');
      setShowAddTag(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddNewTag();
    }
  };

  return (
    <div className="space-y-4">
      {/* Tag Pool */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Available Tags</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {availableTags.map((tag) => (
            <div
              key={tag}
              draggable
              onDragStart={(e) => handleDragStart(e, tag)}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm cursor-move hover:bg-blue-200 transition-colors select-none"
            >
              #{tag}
            </div>
          ))}
        </div>

        {/* Add New Tag */}
        {showAddTag ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter new tag..."
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleAddNewTag}
              className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddTag(false); setNewTag(''); }}
              className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTag(true)}
            className="flex items-center gap-2 px-3 py-1 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Hash className="h-3 w-3" />
            Add New Tag
          </button>
        )}
      </div>

      {/* Media Files with Drop Zones */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700">Drag tags onto media to apply them</div>

        {mediaFiles.map((file, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-3 bg-white border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            {/* Media Thumbnail */}
            <div className="flex-shrink-0">
              {file.type === 'image' ? (
                <img
                  src={file.thumbnailUrl}
                  alt={`Media ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-md"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                  <div className="text-xs text-gray-500">VIDEO</div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-2">
                Media {index + 1} {file.type === 'video' ? '(Video)' : '(Image)'}
              </div>

              <div className="flex flex-wrap gap-1">
                {(file.tags || []).map((tag) => (
                  <div
                    key={tag}
                    className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(index, tag)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {(!file.tags || file.tags.length === 0) && (
                  <div className="text-slate-400 text-xs italic">
                    Drop tags here or drag from the pool above
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}