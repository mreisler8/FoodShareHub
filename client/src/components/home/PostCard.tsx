import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { 
  Heart, MessageCircle, Bookmark, Globe, 
  Users, Send, MapPin, Utensils
} from "lucide-react";
import { PostWithDetails } from "@/lib/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { SocialShare } from "@/components/common/SocialShare";
import { TrustIndicators } from "@/components/shared/TrustIndicators";
import { PostActions } from "@/components/post/PostActions";
import { PostModal } from "@/components/post/PostModal";
import { CommentList } from "@/components/post/CommentList";
import { ListTagDisplay } from "@/components/post/ListTagDisplay";
import { AddToListModal } from "@/components/post/AddToListModal";
import { useAuth } from "@/hooks/use-auth";
import { RestaurantList } from "@shared/schema";

interface PostCardProps {
  post: PostWithDetails;
}

export function PostCard({ post }: PostCardProps) {
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Safety check for post data
  if (!post || !post.author || !post.restaurant) {
    return null;
  }

  // Safely access arrays with fallbacks
  const images = post.images || [];
  const dishesTried = post.dishesTried || [];
  const comments = post.comments || [];

  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Fetch post lists
  const { data: postLists = [] } = useQuery<RestaurantList[]>({
    queryKey: [`/api/posts/${post.id}/lists`],
  });

  // Check if user has liked this post
  const { data: userLikeStatus } = useQuery({
    queryKey: [`/api/posts/${post.id}/likes`],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequest('GET', `/api/posts/${post.id}/likes`);
      const likes = await response.json();
      const userHasLiked = likes.some((like: any) => like.userId === user.id);
      setIsLiked(userHasLiked);
      return likes;
    },
    enabled: !!user && !!post.id,
  });

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to like posts");
      }

      if (isLiked) {
        // Unlike
        const response = await apiRequest("DELETE", `/api/posts/${post.id}/likes`);
        return response.json();
      } else {
        // Like
        const response = await apiRequest("POST", `/api/posts/${post.id}/likes`);
        return response.json();
      }
    },
    onMutate: async () => {
      // Optimistic update
      setIsLiked(!isLiked);
      setLocalLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/likes`] });
      toast({
        title: isLiked ? "Post unliked" : "Post liked",
        description: isLiked ? "Removed from your liked posts" : "Added to your liked posts",
      });
    },
    onError: (error: any) => {
      // Revert optimistic update on error
      setIsLiked(isLiked);
      setLocalLikeCount(post.likeCount || 0);
      toast({
        title: "Error",
        description: error.message || "Failed to update like status. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Save restaurant mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to save restaurants");
      }

      return await apiRequest("POST", "/api/saved-restaurants", {
        restaurantId: post.restaurantId,
        userId: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({
        title: "Restaurant saved",
        description: `${post.restaurant.name} has been saved to your list.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save restaurant. Please try again.",
        variant: "destructive",
      });
    }
  });



  // Handle save button click
  const handleSave = () => {
    saveMutation.mutate();
  };

  // Handle edit click
  const handleEditClick = () => {
    setIsEditFormOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-border hover:shadow-md transition-all duration-200 overflow-hidden">
        {/* Mobile only image - Full width at top */}
        {images.length > 0 && (
          <div className="sm:hidden w-full h-64 bg-neutral-50">
            <img 
              src={images[0]} 
              alt="Post image" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-4">
          {/* Header with clean typography */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${post.userId}`} className="cursor-pointer">
                <Avatar className="w-10 h-10 ring-2 ring-neutral-100">
                  <AvatarImage src={post.author?.profilePicture || ''} alt={post.author?.name || 'User'} />
                  <AvatarFallback className="bg-neutral-200 text-neutral-700 font-semibold text-sm">
                    {post.author?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${post.userId}`} className="font-semibold text-neutral-900 hover:underline text-sm">
                    {post.author?.name || 'User'}
                  </Link>
                  <span className="text-xs text-neutral-500">
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Rating value={post.rating} size="xs" className="mr-1" />
                  {post.visibility === "Public" ? (
                    <Globe className="h-3 w-3 text-neutral-400" />
                  ) : (
                    <Users className="h-3 w-3 text-neutral-400" />
                  )}
                </div>
              </div>
            </div>
            <PostActions 
              post={post} 
              onEditClick={handleEditClick}
              onAddToListClick={() => setIsAddToListOpen(true)}
            />
          </div>

          {/* Restaurant Info - Bold and prominent */}
          <div className="mb-3">
            <Link href={`/restaurants/${post.restaurantId}`}>
              <h3 className="text-lg font-bold text-neutral-900 hover:text-primary transition-colors line-clamp-1">
                {post.restaurant?.name || 'Restaurant'}
              </h3>
            </Link>
            <div className="flex items-center gap-3 mt-1 text-sm text-neutral-600">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> 
                {post.restaurant?.location || 'Location unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Utensils className="h-3.5 w-3.5" /> 
                {post.restaurant?.category || 'Cuisine'}
              </span>
              <span className="font-medium">{post.restaurant?.priceRange || '$'}</span>
            </div>

            {/* Trust Indicators */}
            <div className="mt-2">
              <TrustIndicators 
                restaurantId={post.restaurantId} 
                type="restaurant" 
                size="sm" 
              />
            </div>
          </div>

          {/* List Tags */}
          <ListTagDisplay lists={postLists} className="mb-3" />

          {/* Content with better typography */}
          <div className="mb-4">
            <p className="text-neutral-800 leading-relaxed">{post.content}</p></div>
            {/* Post Header */}
            <div className="p-2.5 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center">
                <Link href={`/profile/${post.userId}`} className="cursor-pointer">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={post.author?.profilePicture || ''} alt={post.author?.name || 'User'} />
                    <AvatarFallback>{post.author?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="ml-2">
                  <div className="flex items-center">
                    <Link href={`/profile/${post.userId}`} className="font-medium text-sm text-neutral-900 hover:underline">
                      {post.author?.name || 'User'}
                    </Link>
                    <span className="text-xs text-neutral-500 ml-2">
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center">
                    <span>rated</span>
                    <Rating value={post.rating} size="xs" className="ml-1 mr-2" />
                    {post.visibility === "Public" ? (
                      <Globe className="text-xs mr-1 h-3 w-3" />
                    ) : (
                      <Users className="text-xs mr-1 h-3 w-3" />
                    )}
                    <span>{post.visibility}</span>
                  </div>
                </div>
              </div>
              <PostActions 
                post={post} 
                onEditClick={handleEditClick}
                onAddToListClick={() => setIsAddToListOpen(true)}
              />
            </div>

            {/* Restaurant & Rating Info - Emphasized */}
            <div className="px-2.5 py-2">
              <Link href={`/restaurants/${post.restaurantId}`} className="flex items-center">
                <h3 className="text-base font-medium text-primary hover:underline">{post.restaurant?.name || 'Restaurant'}</h3>
              </Link>
              <div className="flex flex-wrap items-center mt-1 gap-2">
                <span className="inline-flex items-center text-xs text-neutral-700">
                  <MapPin className="mr-1 text-neutral-500 h-3 w-3" /> 
                  {post.restaurant?.location || 'Location unknown'}
                </span>
                <span className="inline-flex items-center text-xs text-neutral-700">
                  <Utensils className="mr-1 text-neutral-500 h-3 w-3" /> 
                  {post.restaurant?.category || 'Cuisine'}
                </span>
                <span className="text-xs font-medium">{post.restaurant?.priceRange || '$'}</span>
              </div>

              {/* Trust Indicators - More Prominent */}
              <div className="mt-2">
                <TrustIndicators 
                  restaurantId={post.restaurantId} 
                  type="restaurant" 
                  size="sm" 
                />
              </div>

              {/* List Tags Display */}
              <ListTagDisplay lists={postLists} className="mt-2" />
            </div>

            {/* Mobile only image - Small & Compact */}
            {images.length > 0 && (
              <div className="sm:hidden w-full h-32 bg-neutral-100">
                <img 
                  src={images[0]} 
                  alt="Post image" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Condensed Content & Dishes */}
            <div className="px-2.5 py-2">
              <p className="text-sm text-neutral-700">{post.content}</p>

              {/* Dishes Tried Section - Horizontal Scrolling */}
              {dishesTried.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <h4 className="text-xs font-medium text-neutral-500 mb-1">Dishes:</h4>
                  <div className="flex gap-1 pb-1">
                    {dishesTried.map((dish: string, index: number) => (
                      <span key={index} className="px-2 py-0.5 bg-neutral-100 rounded-full text-xs whitespace-nowrap text-neutral-700">
                        {dish}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional information */}
              {(post.priceAssessment || post.atmosphere || post.serviceRating) && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {post.priceAssessment && (
                    <div>
                      <span className="font-medium text-neutral-500">Price: </span>
                      <span className="text-neutral-700">{post.priceAssessment}</span>
                    </div>
                  )}
                  {post.atmosphere && (
                    <div>
                      <span className="font-medium text-neutral-500">Atmosphere: </span>
                      <span className="text-neutral-700">{post.atmosphere}</span>
                    </div>
                  )}
                  {post.serviceRating && (
                    <div>
                      <span className="font-medium text-neutral-500">Service: </span>
                      <span className="text-neutral-700">{post.serviceRating}/5</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons - Simplified & Compact */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center space-x-3">
                  <button 
                    className={`flex items-center transition-colors ${isLiked ? 'text-red-500' : 'text-neutral-500 hover:text-red-400'}`}
                    onClick={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending || !user}
                  >
                    <Heart className={`mr-1 h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="text-xs">{localLikeCount}</span>
                  </button>
                  <button 
                    className="flex items-center text-neutral-500 hover:text-blue-400 transition-colors"
                    onClick={() => setShowAllComments(!showAllComments)}
                  >
                    <MessageCircle className="mr-1 h-3.5 w-3.5" />
                    <span className="text-xs">{comments.length}</span>
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    className={`flex items-center ${post.isSaved ? 'text-secondary' : 'text-neutral-500'}`}
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                  >
                    <Bookmark className={`mr-1 h-3.5 w-3.5 ${post.isSaved ? 'fill-current' : ''}`} />
                    <span className="text-xs">Save</span>
                  </button>
                  <SocialShare 
                    url={`${window.location.origin}/posts/${post.id}`}
                    title={`${post.author?.name || 'Someone'} recommends ${post.restaurant?.name || 'a restaurant'}`}
                    description={post.content}
                    image={images.length > 0 ? images[0] : ''}
                    contentId={post.id}
                    userId={user?.id ?? 0}
                    variant="icon"
                    className="text-neutral-500"
                  />
                </div>
              </div>

              {/* Comments Section with CommentList Component */}
              <CommentList 
                postId={post.id}
                showAll={showAllComments}
                onToggleShowAll={() => setShowAllComments(!showAllComments)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Post Modal Dialog */}
      {isEditFormOpen && (
        <PostModal
          post={post}
          open={isEditFormOpen}
          onOpenChange={setIsEditFormOpen}
        />
      )}

      {/* Add to List Modal */}
      <AddToListModal
        open={isAddToListOpen}
        onOpenChange={setIsAddToListOpen}
        postId={post.id}
      />
    </>
  );
}