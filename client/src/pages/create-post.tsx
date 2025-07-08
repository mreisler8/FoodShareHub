import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { PostModal } from "@/components/post/PostModal";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CreatePost() {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(true);
  
  // When modal closes, navigate back to home
  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      navigate("/");
    }
  };
  
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar - only show on desktop */}
      {!isMobile && <DesktopSidebar />}
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Post</h1>
            <p className="text-gray-600 mb-8">Share your dining experience with the community</p>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation at bottom of screen - only show on mobile */}
      {isMobile && <MobileNavigation />}
      
      {/* PostModal */}
      <PostModal 
        open={isModalOpen} 
        onOpenChange={handleModalClose}
      />
    </div>
  );
}
