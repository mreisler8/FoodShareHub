
import React, { useState } from 'react';
import { ModernCreatePost } from '@/components/post/ModernCreatePost';
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
    <ModernCreatePost
      open={isOpen}
      onOpenChange={handleClose}
    />
  );
}
