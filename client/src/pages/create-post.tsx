import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { CreatePostForm } from "@/components/create-post/CreatePostForm";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CreatePost() {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar - only show on desktop */}
      {!isMobile && <DesktopSidebar />}
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/">
            <div className="mr-4 text-neutral-700 cursor-pointer p-2">
              <ArrowLeft className="h-5 w-5" />
            </div>
          </Link>
          <h1 className="text-xl font-heading font-bold text-neutral-900">Create Post</h1>
        </header>
        
        {/* Create Post Form */}
        <div className={isMobile ? "pb-24" : "pb-6"}>
          <CreatePostForm />
        </div>
      </div>
      
      {/* Add padding at the bottom to avoid the mobile navigation bar */}
      {isMobile && <div className="h-20" />}
      
      {/* Mobile navigation at bottom of screen - only show on mobile */}
      {isMobile && <MobileNavigation />}
    </div>
  );
}
