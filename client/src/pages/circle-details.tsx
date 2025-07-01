import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Users } from "lucide-react";
import { CircleWithStats } from "@/lib/types";

import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantListsSection } from "@/components/lists/RestaurantListsSection";

export default function CircleDetails() {
  const { id } = useParams();
  
  const { data: circle, isLoading: isCircleLoading } = useQuery<CircleWithStats>({
    queryKey: [`/api/circles/${id}`],
  });
  

  
  // Set page title
  useEffect(() => {
    if (circle) {
      document.title = `${circle.name} | Circles`;
    }
    return () => {
      document.title = "Circles";
    };
  }, [circle]);

  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center text-neutral-700 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
          </Link>
        </div>
        
        {/* Circle Header */}
        {isCircleLoading ? (
          <div className="mb-8">
            <Skeleton className="h-40 w-full rounded-xl mb-4" />
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : circle ? (
          <div className="mb-8">
            <div className="relative h-40 rounded-xl overflow-hidden mb-4 bg-gradient-to-r from-primary to-primary-foreground">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <h1 className="text-2xl font-heading font-bold text-white">{circle.name}</h1>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-neutral-700">{circle.description}</p>
                <div className="flex items-center mt-2 text-sm text-neutral-500">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{(circle.memberCount / 1000).toFixed(1)}k members</span>
                  </div>
                  <span className="mx-2">•</span>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>Created by Admin</span>
                  </div>
                </div>
              </div>
              
              <Button className="bg-secondary text-white hover:bg-secondary/90">
                Join Circle
              </Button>
            </div>
          </div>
        ) : null}
        
        {/* Restaurant Lists */}
        {circle && (
          <RestaurantListsSection 
            circleId={parseInt(id!)} 
            title="Curated Restaurant Lists" 
            showCreateButton={true} 
            maxLists={4}
          />
        )}
        
        {/* All Restaurant Lists in Circle */}
        {circle && (
          <RestaurantListsSection 
            circleId={parseInt(id!)} 
            title="All Shared Lists" 
            showCreateButton={true}
            maxLists={undefined} // Show all lists
          />
        )}
        
        {/* Circle Members Section */}
        <div className="mb-10">
          <h2 className="text-xl font-heading font-bold text-neutral-900 mb-4">Circle Members</h2>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-neutral-500 text-center">
              Members management coming soon. Invite your friends to share restaurant recommendations!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}