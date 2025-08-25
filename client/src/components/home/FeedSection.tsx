
import { useQuery } from "@tanstack/react-query";
import { PostCard } from "./PostCard";
import { PostWithDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export function FeedSection() {
  const [showCreateCanvas, setShowCreateCanvas] = useState(false);
  
  const { data: feedData, isLoading, refetch } = useQuery({
    queryKey: ["/api/feed"],
    queryFn: async () => {
      const response = await fetch('/api/feed?includeMoments=true');
      if (!response.ok) throw new Error('Failed to fetch feed');
      return response.json();
    },
  });

  // Handle both direct posts array and nested posts object structure
  const posts = Array.isArray(feedData?.posts) ? feedData.posts : 
                Array.isArray(feedData) ? feedData : [];

  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen">
      {/* Stories Section - Instagram Style */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide">
          {/* Your Story */}
          <div className="flex flex-col items-center space-y-1 flex-shrink-0">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-700 font-medium">Your Story</span>
          </div>
          
          {/* Friend Stories */}
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex flex-col items-center space-y-1 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <div className="w-full h-full rounded-full bg-gray-300"></div>
                </div>
              </div>
              <span className="text-xs text-gray-700 font-medium">Friend {i}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed Content */}
      <div className="pb-20">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-0">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white">
                {/* Header skeleton */}
                <div className="flex items-center px-4 py-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="ml-3 flex-1">
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                  <Skeleton className="w-6 h-6" />
                </div>
                
                {/* Image skeleton */}
                <Skeleton className="w-full aspect-square" />
                
                {/* Actions skeleton */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex space-x-4">
                      <Skeleton className="w-6 h-6" />
                      <Skeleton className="w-6 h-6" />
                      <Skeleton className="w-6 h-6" />
                    </div>
                    <Skeleton className="w-6 h-6" />
                  </div>
                  <Skeleton className="h-3 w-32 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Post list */}
        {posts && posts.length > 0 ? (
          <div className="space-y-0">
            {posts.map((post) => (
              <ModernPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : !isLoading && (
          <div className="text-center py-16 px-4">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-6">Follow friends to see their food moments</p>
            <Button 
              onClick={() => setShowCreateCanvas(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Share your first moment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Modern Instagram-style Post Card Component
function ModernPostCard({ post }: { post: PostWithDetails }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  
  return (
    <article className="bg-white border-b border-gray-100">
      {/* Post Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {post.user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {post.user?.name || 'Unknown User'}
            </h3>
            <p className="text-xs text-gray-500">
              {post.restaurant?.name && (
                <span>{post.restaurant.name} • </span>
              )}
              2h ago
            </p>
          </div>
        </div>
        <button className="p-1">
          <MoreHorizontal className="w-5 h-5 text-gray-700" />
        </button>
      </header>

      {/* Post Image/Content */}
      <div className="relative">
        {post.imageUrl ? (
          <img 
            src={post.imageUrl} 
            alt={post.title || "Food moment"}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center p-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                {post.title || "Food Moment"}
              </h4>
              {post.restaurant?.name && (
                <p className="text-gray-600 font-medium">
                  📍 {post.restaurant.name}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Overlay for list posts */}
        {post.type === 'list' && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
            <div className="bg-white rounded-full px-4 py-2 shadow-lg">
              <span className="text-sm font-semibold text-gray-800">
                📝 {post.items?.length || 0} places
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex space-x-4">
            <button 
              onClick={() => setLiked(!liked)}
              className={`transition-colors ${liked ? 'text-red-500' : 'text-gray-700'}`}
            >
              <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
            </button>
            <button className="text-gray-700">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <button 
            onClick={() => setSaved(!saved)}
            className={`transition-colors ${saved ? 'text-gray-900' : 'text-gray-700'}`}
          >
            <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Like count */}
        <div className="mb-2">
          <span className="text-sm font-semibold text-gray-900">
            {Math.floor(Math.random() * 100) + 10} likes
          </span>
        </div>

        {/* Caption */}
        <div className="text-sm">
          <span className="font-semibold text-gray-900 mr-2">
            {post.user?.name || 'user'}
          </span>
          <span className="text-gray-900">
            {post.content || post.description || "Amazing food experience! 🍽️"}
          </span>
        </div>

        {/* View comments */}
        <button className="text-sm text-gray-500 mt-2">
          View all {Math.floor(Math.random() * 20) + 1} comments
        </button>

        {/* Time ago */}
        <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide">
          2 HOURS AGO
        </p>
      </div>
    </article>
  );
}
