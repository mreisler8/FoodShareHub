import React, { useState } from 'react';
import { PostTypeModal } from './PostTypeModal';
import { CreatePostModal } from './CreatePostModal';
import { useToast } from '@/hooks/use-toast';

interface PostFormContainerProps {
  onClose?: () => void;
}

export function PostFormContainer({ onClose }: PostFormContainerProps) {
  const [showTypeModal, setShowTypeModal] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const { toast } = useToast();

  const handleModalClose = () => {
    // Reset form state
    setShowTypeModal(false);
    setShowCreateModal(false);
    setSelectedType('');
    
    if (onClose) {
      onClose();
    } else {
      // Navigate to homepage if no onClose handler
      window.location.href = '/';
    }
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setShowTypeModal(false);
    setShowCreateModal(true);
  };

  const handleCreateModalClose = () => {
    // Return to type selection
    setShowCreateModal(false);
    setShowTypeModal(true);
  };

  return (
    <>
      <PostTypeModal
        open={showTypeModal}
        onOpenChange={(open) => {
          if (!open) {
            handleModalClose();
          }
        }}
        onSelectType={handleTypeSelect}
      />
      
      <CreatePostModal
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            handleCreateModalClose();
          }
        }}
        postType={selectedType}
      />
    </>
  );
}