import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CircleWithStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/Button";
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

export function FeaturedCircles() {
  const { data: circles, isLoading } = useQuery<CircleWithStats[]>({
    queryKey: ["/api/circles/featured"],
  });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-heading font-bold text-neutral-900">Popular Circles</h2>
          <p className="text-xs text-neutral-500">Join trusted recommendation circles</p>
        </div>
        <Link href="/discover" className="text-primary font-medium text-sm flex items-center">
            <span>Explore All</span>
            <ChevronRight className="h-4 w-4 ml-1" />
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
        
        {(!circles || circles.length === 0) && (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-100 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
    <div className="p-3">
      <div className="flex justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-primary">Italian Food Lovers NYC</h3>
          <p className="text-xs text-neutral-600 mt-1">Discover the best Italian restaurants in New York, curated by local food enthusiasts.</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            <span className="text-xs text-neutral-500 flex items-center">
              <Users className="h-3 w-3 mr-1 text-neutral-400" />
              2.5k members
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

{circles?.map((circle) => (
          <div key={circle.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-100 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
            <Link href={`/circles/${circle.id}`} className="block p-3">
                <div className="flex justify-between">
                  {/* Circle info - Left side */}
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="font-medium text-primary">{circle.name}</h3>
                      {circle.trending && (
                        <span className="ml-2 text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full flex items-center">
                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                          Trending
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{circle.description || 'A trusted circle of food enthusiasts sharing their recommendations.'}</p>
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      <span className="text-xs text-neutral-500 flex items-center">
                        <Users className="h-3 w-3 mr-1 text-neutral-400" />
                        {(circle.memberCount / 1000).toFixed(1)}k members
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1 text-neutral-400" />
                        {circle.postCount || 0} posts
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center">
                        <Utensils className="h-3 w-3 mr-1 text-neutral-400" />
                        {circle.category || 'Food'}
                      </span>
                    </div>
                    
                    {/* Trust indicators */}
                    <div className="mt-2">
                      <TrustIndicators 
                        circleId={circle.id}
                        type="circle"
                        size="sm"
                        showLabel={false}
                      />
                    </div>
                  </div>
                  
                  {/* Circle thumbnail - Right side */}
                  <div className="ml-3 w-14 h-14 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                    {circle.image ? (
                      <img 
                        src={circle.image} 
                        alt={circle.name} 
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
                    Join Circle
                  </Button>
                </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
