import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Users, UserPlus, Share2 } from "lucide-react";
import { CircleWithStats } from "@/lib/types";
import { PostCard } from "@/components/home/PostCard";
import { CreatePostButton } from "@/components/create-post/CreatePostButton";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantListsSection } from "@/components/lists/RestaurantListsSection";
import { ReferralButton } from "@/components/invitation/ReferralButton";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function CircleDetails() {
  const { id } = useParams();
  const { currentUser } = useCurrentUser();
  
  const { data: circle, isLoading: isCircleLoading } = useQuery<CircleWithStats>({
    queryKey: [`/api/circles/${id}`],
  });
  
  const { data: feedPosts = [], isLoading: isPostsLoading } = useQuery<any[]>({
    queryKey: ["/api/feed"],
    // In a real app, we would fetch only posts for this circle
    // queryKey: [`/api/circles/${id}/posts`],
  });
  
  // Set page title
  useEffect(() => {
    if (circle) {
      document.title = `${circle.name} | TasteBuds`;
    }
    return () => {
      document.title = "TasteBuds";
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
          <Link href="/">
            <div className="inline-flex items-center text-neutral-700 hover:text-neutral-900 cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
            </div>
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
            <div className="relative h-40 rounded-xl overflow-hidden mb-4">
              <img 
                src={circle.image} 
                alt={circle.name} 
                className="w-full h-full object-cover"
              />
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
              
              <div className="flex space-x-2">
                <ReferralButton
                  userId={currentUser?.id || 1}
                  circleId={parseInt(id!)}
                  circleName={circle.name}
                  referralType="circle"
                  variant="secondary"
                  size="sm"
                >
                  <Share2 className="h-4 w-4 mr-2" /> Invite Friends
                </ReferralButton>
                <Button className="bg-secondary text-white hover:bg-secondary/90">
                  Join Circle
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        
        {/* Restaurant Lists */}
        {circle && (
          <RestaurantListsSection 
            hubId={parseInt(id!)} 
            title="Curated Restaurant Lists" 
            showCreateButton={true} 
            maxLists={4}
          />
        )}
        
        {/* Circle Posts */}
        <div className="mb-10">
          <h2 className="text-xl font-heading font-bold text-neutral-900 mb-4">Recent Posts</h2>
          
          {isPostsLoading ? (
            <div className="space-y-6">
              {Array(2).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="ml-3 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-64 w-full" />
                </div>
              ))}
            </div>
          ) : feedPosts && feedPosts.length > 0 ? (
            feedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-xl shadow-sm">
              <p className="text-neutral-500">No posts in this circle yet.</p>
              <p className="text-neutral-500 mt-2">Be the first to share your experience!</p>
            </div>
          )}
        </div>
        
        {/* Floating Action Button for Post Creation */}
        <CreatePostButton />
      </div>
    </div>
  );
}