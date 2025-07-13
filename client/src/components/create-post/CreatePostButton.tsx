import { useState } from "react";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PostModal } from "@/components/post/PostModal";

export function CreatePostButton() {
  const isMobile = useIsMobile();
  const [showPostModal, setShowPostModal] = useState(false);
  
  // Don't render the floating button on mobile as we have the tab bar button
  if (isMobile) {
    return (
      <>
        <PostModal open={showPostModal} onOpenChange={setShowPostModal} />
      </>
    );
  }
  
  return (
    <>
      <div 
        className="fixed bottom-8 right-5 z-40 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-colors cursor-pointer"
        onClick={() => setShowPostModal(true)}
      >
        <Plus className="text-xl" />
      </div>
      
      <PostModal open={showPostModal} onOpenChange={setShowPostModal} />
    </>
  );
}
