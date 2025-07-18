import React, { useState } from 'react';
import { UnifiedPostModal } from '@/components/post/UnifiedPostModal';

interface PostFormContainerProps {
  onClose?: () => void;
}

export function PostFormContainer({ onClose }: PostFormContainerProps) {
  const [showPostModal, setShowPostModal] = useState(true);

  const handleModalClose = () => {
    setShowPostModal(false);
    
    if (onClose) {
      onClose();
    } else {
      // Navigate to homepage if no onClose handler
      window.location.href = '/';
    }
  };

  return (
    <UnifiedPostModal
      open={showPostModal}
      onOpenChange={(open) => {
        if (!open) {
          handleModalClose();
        }
      }}
    />
  );
}