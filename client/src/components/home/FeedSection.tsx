import { useQuery } from "@tanstack/react-query";
import { PostCard } from "./PostCard";
import { PostWithDetails } from "@/lib/types";
import { Button } from "@/components/Button";
import { Filter, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function FeedSection() {
  const { data: feedData, isLoading, refetch } = useQuery({
    queryKey: ["/api/feed"],
  });

  // Handle both direct posts array and nested posts object structure
  const posts = Array.isArray(feedData?.posts) ? feedData.posts : 
                Array.isArray(feedData) ? feedData : [];

  return (
    <div className="mb-20 md:mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-heading font-bold text-neutral-900">Your Feed</h2>
        <div className="flex items-center">
          <button className="text-neutral-700 font-medium text-sm flex items-center">
            <Filter className="mr-1 h-4 w-4" /> Filter
          </button>
          <span className="mx-2 text-neutral-300">|</span>
          <button className="text-neutral-700 font-medium text-sm flex items-center">
            <RefreshCw className="mr-1 h-4 w-4" /> Recent
          </button>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
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
              <div className="px-4 pb-3">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-64 w-full" />
              <div className="p-4">
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Post list */}
      {posts && posts.length > 0 ? (
        posts.slice(0, 3).map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      ) : !isLoading && (
        <div className="text-center py-8 bg-white rounded-xl shadow-sm">
          <p className="text-neutral-500">No posts in your feed yet.</p>
        </div>
      )}
      
      {/* Load more */}
      {posts && posts.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => refetch()}
            className="bg-secondary text-white rounded-lg flex items-center font-medium"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Load More
          </Button>
        </div>
      )}
    </div>
  );
}
