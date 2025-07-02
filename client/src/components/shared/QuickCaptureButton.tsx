import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PostModal } from '@/components/post/PostModal';

export function QuickCaptureButton() {
  const [showPostModal, setShowPostModal] = useState(false);

  return (
    <>
      <Button 
        className="rounded-full h-14 w-14 shadow-lg fixed bottom-20 right-6 z-50"
        size="icon"
        onClick={() => setShowPostModal(true)}
        aria-label="Create new post"
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      <PostModal open={showPostModal} onOpenChange={setShowPostModal} />
    </>
  );
}