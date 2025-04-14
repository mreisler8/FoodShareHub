import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Users } from "lucide-react";
import { HubWithStats } from "@/lib/types";
import { PostCard } from "@/components/home/PostCard";
import { CreatePostButton } from "@/components/create-post/CreatePostButton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HubDetails() {
  const { id } = useParams();
  
  const { data: hub, isLoading: isHubLoading } = useQuery<HubWithStats>({
    queryKey: [`/api/hubs/${id}`],
  });
  
  const { data: feedPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: ["/api/feed"],
    // In a real app, we would fetch only posts for this hub
    // queryKey: [`/api/hubs/${id}/posts`],
  });
  
  // Set page title
  useEffect(() => {
    if (hub) {
      document.title = `${hub.name} | TasteBuds`;
    }
    return () => {
      document.title = "TasteBuds";
    };
  }, [hub]);

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
            <a className="inline-flex items-center text-neutral-700 hover:text-neutral-900">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
            </a>
          </Link>
        </div>
        
        {/* Hub Header */}
        {isHubLoading ? (
          <div className="mb-8">
            <Skeleton className="h-40 w-full rounded-xl mb-4" />
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : hub ? (
          <div className="mb-8">
            <div className="relative h-40 rounded-xl overflow-hidden mb-4">
              <img 
                src={hub.image} 
                alt={hub.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <h1 className="text-2xl font-heading font-bold text-white">{hub.name}</h1>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-neutral-700">{hub.description}</p>
                <div className="flex items-center mt-2 text-sm text-neutral-500">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{(hub.memberCount / 1000).toFixed(1)}k members</span>
                  </div>
                  <span className="mx-2">•</span>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>Created by Admin</span>
                  </div>
                </div>
              </div>
              
              <Button className="bg-secondary text-white hover:bg-secondary/90">
                Join Hub
              </Button>
            </div>
          </div>
        ) : null}
        
        {/* Hub Posts */}
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
              <p className="text-neutral-500">No posts in this hub yet.</p>
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
