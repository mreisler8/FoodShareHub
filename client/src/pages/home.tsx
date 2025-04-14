import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { DesktopRightSidebar } from "@/components/navigation/DesktopRightSidebar";
import { StoriesCarousel } from "@/components/home/StoriesCarousel";
import { FeaturedHubs } from "@/components/home/FeaturedHubs";
import { FeedSection } from "@/components/home/FeedSection";
import { CreatePostButton } from "@/components/create-post/CreatePostButton";
import { Bell, MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 11h.01"></path>
                <path d="M11 15h.01"></path>
                <path d="M16 16h.01"></path>
                <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"></path>
                <path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"></path>
              </svg>
            </div>
            <h1 className="ml-3 text-2xl font-heading font-bold text-neutral-900">TasteBuds</h1>
          </div>
          <div className="flex items-center">
            <button className="p-2">
              <Bell className="text-neutral-700 h-5 w-5" />
            </button>
            <button className="p-2 ml-1">
              <MessageSquare className="text-neutral-700 h-5 w-5" />
            </button>
          </div>
        </header>
        
        {/* Stories/Quick Access */}
        <StoriesCarousel />
        
        {/* Featured Hubs Section */}
        <FeaturedHubs />
        
        {/* Feed Section */}
        <FeedSection />
        
        {/* Floating Action Button for Post Creation */}
        <CreatePostButton />
      </div>
      
      {/* Right Sidebar (Desktop Only) */}
      <DesktopRightSidebar />
    </div>
  );
}
