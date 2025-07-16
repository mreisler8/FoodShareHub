
import React from 'react';
import { PostFormContainer } from '@/components/create-post/PostFormContainer';
import { useLocation } from 'wouter';

export default function CreatePost() {
  const [, navigate] = useLocation();

  const handleClose = () => {
    navigate('/feed');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <PostFormContainer onClose={handleClose} />
      </div>
    </div>
  );
}
