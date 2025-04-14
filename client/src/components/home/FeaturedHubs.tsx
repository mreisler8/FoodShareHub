import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { HubWithStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrustIndicators } from "@/components/shared/TrustIndicators";
import {
  Users,
  MessageSquare,
  Bookmark,
  Utensils,
  Map,
  TrendingUp,
  ChevronRight
} from "lucide-react";

export function FeaturedHubs() {
  const { data: hubs, isLoading } = useQuery<HubWithStats[]>({
    queryKey: ["/api/hubs/featured"],
  });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-heading font-bold text-neutral-900">Popular Communities</h2>
          <p className="text-xs text-neutral-500">Find groups based on your interests</p>
        </div>
        <Link href="/discover">
          <a className="text-primary font-medium text-sm flex items-center">
            <span>Explore All</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        </Link>
      </div>
      
      <div className="space-y-2">
        {isLoading && 
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-100 p-3">
              <div className="flex justify-between">
                <div>
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </div>
          ))
        }
        
        {hubs?.map((hub) => (
          <div key={hub.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-100 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
            <Link href={`/hubs/${hub.id}`}>
              <a className="block p-3">
                <div className="flex justify-between">
                  {/* Hub info - Left side */}
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="font-medium text-primary">{hub.name}</h3>
                      {hub.trending && (
                        <span className="ml-2 text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full flex items-center">
                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                          Trending
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{hub.description || 'A community of food enthusiasts sharing their experiences and recommendations.'}</p>
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      <span className="text-xs text-neutral-500 flex items-center">
                        <Users className="h-3 w-3 mr-1 text-neutral-400" />
                        {(hub.memberCount / 1000).toFixed(1)}k members
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1 text-neutral-400" />
                        {hub.postCount || 0} posts
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center">
                        <Utensils className="h-3 w-3 mr-1 text-neutral-400" />
                        {hub.category || 'Food'}
                      </span>
                    </div>
                    
                    {/* Trust indicators */}
                    <div className="mt-2">
                      <TrustIndicators 
                        hubId={hub.id}
                        type="hub"
                        size="sm"
                        showLabel={false}
                      />
                    </div>
                  </div>
                  
                  {/* Hub thumbnail - Right side */}
                  <div className="ml-3 w-14 h-14 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                    {hub.image ? (
                      <img 
                        src={hub.image} 
                        alt={hub.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <Utensils className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Join button */}
                <div className="mt-3 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 px-3 text-xs rounded-full"
                  >
                    <Users className="h-3 w-3 mr-1.5" />
                    Join Community
                  </Button>
                </div>
              </a>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
