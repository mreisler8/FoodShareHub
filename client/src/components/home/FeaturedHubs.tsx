import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { HubWithStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedHubs() {
  const { data: hubs, isLoading } = useQuery<HubWithStats[]>({
    queryKey: ["/api/hubs/featured"],
  });

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-heading font-bold text-neutral-900">Featured Hubs</h2>
        <Link href="/discover">
          <a className="text-secondary font-medium text-sm">View All</a>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && 
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <Skeleton className="h-32 w-full" />
              <div className="p-3">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))
        }
        
        {hubs?.map((hub) => (
          <div key={hub.id} className="bg-white rounded-xl shadow-sm overflow-hidden transition-transform duration-200 hover:translate-y-[-4px]">
            <Link href={`/hubs/${hub.id}`}>
              <a className="block">
                <div className="relative h-32">
                  <img 
                    src={hub.image} 
                    alt={hub.name} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <h3 className="absolute bottom-3 left-3 text-white font-bold font-heading">{hub.name}</h3>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-sm text-neutral-700">{(hub.memberCount / 1000).toFixed(1)}k members</span>
                    <span className="mx-2 text-neutral-300">•</span>
                    <span className="text-sm text-neutral-700">{hub.postCount || 0} posts</span>
                  </div>
                  <button className="text-secondary font-medium text-sm">Join</button>
                </div>
              </a>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
