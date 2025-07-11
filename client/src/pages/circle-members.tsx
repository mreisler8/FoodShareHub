import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { CircleManagement } from "@/components/circles/CircleManagement";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CircleMembers() {
  const { id } = useParams();
  const isMobile = useIsMobile();
  
  if (!id) {
    return <div>Circle ID not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? <MobileNavigation /> : <DesktopSidebar />}
      
      <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Back Button */}
          <div className="mb-4">
            <Link href={`/circles/${id}`} className="inline-flex items-center text-neutral-700 hover:text-neutral-900">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Circle
            </Link>
          </div>
          
          {/* Circle Management Component */}
          <CircleManagement circleId={parseInt(id)} />
        </div>
      </div>
    </div>
  );
}