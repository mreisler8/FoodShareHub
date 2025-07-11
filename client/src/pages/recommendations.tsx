import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { RecentRecommendations } from "@/components/recommendations/RecentRecommendations";

export default function RecommendationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      {/* Desktop Layout */}
      <div className="hidden md:flex">
        <DesktopSidebar />
        <div className="flex-1 md:ml-64">
          <div className="max-w-4xl mx-auto p-6">
            <RecentRecommendations />
          </div>
        </div>
      </div>
      
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="p-4 pb-20">
          <RecentRecommendations />
        </div>
      </div>
    </div>
  );
}