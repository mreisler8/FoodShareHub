
import React, { useState } from 'react';
import { EnhancedCreatePost } from '@/components/post/EnhancedCreatePost';
import { useLocation } from 'wouter';

export default function CreatePost() {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = (open: boolean) => {
    if (!open) {
      navigate('/feed');
    }
    setIsOpen(open);
  };

  return (
    <EnhancedCreatePost
      open={isOpen}
      onOpenChange={handleClose}
    />
  );
}
