import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { CreatePostForm } from "@/components/create-post/CreatePostForm";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CreatePost() {
  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Mobile Header */}
        <header className="flex items-center mb-6">
          <Link href="/">
            <a className="mr-4 text-neutral-700">
              <ArrowLeft className="h-5 w-5" />
            </a>
          </Link>
          <h1 className="text-xl font-heading font-bold text-neutral-900">Create Post</h1>
        </header>
        
        {/* Create Post Form */}
        <CreatePostForm />
      </div>
    </div>
  );
}
