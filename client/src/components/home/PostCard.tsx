import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { 
  Heart, MessageCircle, Bookmark, Globe, 
  Users, Send, MapPin, Utensils
} from "lucide-react";
import { PostWithDetails } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { SocialShare } from "@/components/common/SocialShare";
import { TrustIndicators } from "@/components/shared/TrustIndicators";
import { PostActions } from "@/components/post/PostActions";
import { EditPostForm } from "@/components/post/EditPostForm";
import { useAuth } from "@/hooks/use-auth";

interface PostCardProps {
  post: PostWithDetails;
}

export function PostCard({ post }: PostCardProps) {
  const [newComment, setNewComment] = useState("");
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Safety check for post data
  if (!post || !safePost.author || !safePost.restaurant) {
    return null;
  }
  
  // Ensure arrays are never null
  const safePost = {
    ...post,
    images: safePost.images || [],
    dishesTried: safePost.dishesTried || [],
    comments: safePost.comments || []
  };
  
  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Add like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to like posts");
      }
      
      if (safePost.isLiked) {
        // Unlike
        return await apiRequest("DELETE", `/api/posts/${safePost.id}/likes/${user.id}`);
      } else {
        // Like
        return await apiRequest("POST", "/api/likes", { postId: safePost.id, userId: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to like safePost. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to comment");
      }
      
      return await apiRequest("POST", "/api/comments", {
        postId: safePost.id,
        userId: user.id,
        content: newComment
      });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
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
        restaurantId: safePost.restaurantId,
        userId: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({
        title: "Restaurant saved",
        description: `${safePost.restaurant.name} has been saved to your list.`,
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
  
  // Handle like button click
  const handleLike = () => {
    likeMutation.mutate();
  };
  
  // Handle comment submission
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      commentMutation.mutate();
    }
  };
  
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4 transition-transform duration-200 hover:translate-y-[-2px] border border-neutral-100">
        <div className="flex">
          {/* Left column - minimal image */}
          {safePost.images.length > 0 && (
            <div className="hidden sm:block w-24 h-24 sm:w-32 sm:h-full bg-neutral-100 flex-shrink-0">
              <img 
                src={safePost.images[0]} 
                alt="Post image" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Right column - text-focused content */}
          <div className="flex-1">
            {/* Post Header */}
            <div className="p-3 flex items-center justify-between border-b border-neutral-100">
              <div className="flex items-center">
                <Link href={`/profile/${safePost.userId}`} className="cursor-pointer">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={safePost.author?.profilePicture || ''} alt={safePost.author?.name || 'User'} />
                    <AvatarFallback>{safePost.author?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="ml-2">
                  <div className="flex items-center">
                    <Link href={`/profile/${safePost.userId}`} className="font-medium text-sm text-neutral-900 hover:underline">
                      {safePost.author?.name || 'User'}
                    </Link>
                    <span className="text-xs text-neutral-500 ml-2">
                      {formatTimeAgo(safePost.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center">
                    <span>rated</span>
                    <Rating value={safePost.rating} size="xs" className="ml-1 mr-2" />
                    {safePost.visibility === "Public" ? (
                      <Globe className="text-xs mr-1 h-3 w-3" />
                    ) : (
                      <Users className="text-xs mr-1 h-3 w-3" />
                    )}
                    <span>{safePost.visibility}</span>
                  </div>
                </div>
              </div>
              <PostActions post={post} onEditClick={handleEditClick} />
            </div>
            
            {/* Restaurant & Rating Info - Emphasized */}
            <div className="px-3 py-2">
              <Link href={`/restaurants/${safePost.restaurantId}`} className="flex items-center">
                <h3 className="text-base font-medium text-primary hover:underline">{safePost.restaurant?.name || 'Restaurant'}</h3>
              </Link>
              <div className="flex flex-wrap items-center mt-1 gap-2">
                <span className="inline-flex items-center text-xs text-neutral-700">
                  <MapPin className="mr-1 text-neutral-500 h-3 w-3" /> 
                  {safePost.restaurant?.location || 'Location unknown'}
                </span>
                <span className="inline-flex items-center text-xs text-neutral-700">
                  <Utensils className="mr-1 text-neutral-500 h-3 w-3" /> 
                  {safePost.restaurant?.category || 'Cuisine'}
                </span>
                <span className="text-xs font-medium">{safePost.restaurant?.priceRange || '$'}</span>
              </div>
              
              {/* Trust Indicators - More Prominent */}
              <div className="mt-2">
                <TrustIndicators 
                  restaurantId={safePost.restaurantId} 
                  type="restaurant" 
                  size="sm" 
                />
              </div>
            </div>
            
            {/* Mobile only image - Small & Compact */}
            {safePost.images && safePost.images.length > 0 && (
              <div className="sm:hidden w-full h-32 bg-neutral-100">
                <img 
                  src={safePost.images[0]} 
                  alt="Post image" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Condensed Content & Dishes */}
            <div className="px-3 py-2">
              <p className="text-sm text-neutral-700">{safePost.content}</p>
              
              {/* Dishes Tried Section - Horizontal Scrolling */}
              {safePost.dishesTried && safePost.dishesTried.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <h4 className="text-xs font-medium text-neutral-500 mb-1">Dishes:</h4>
                  <div className="flex gap-1 pb-1">
                    {safePost.dishesTried.map((dish, index) => (
                      <span key={index} className="px-2 py-0.5 bg-neutral-100 rounded-full text-xs whitespace-nowrap text-neutral-700">
                        {dish}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Additional information */}
              {(safePost.priceAssessment || safePost.atmosphere || safePost.serviceRating) && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {safePost.priceAssessment && (
                    <div>
                      <span className="font-medium text-neutral-500">Price: </span>
                      <span className="text-neutral-700">{safePost.priceAssessment}</span>
                    </div>
                  )}
                  {safePost.atmosphere && (
                    <div>
                      <span className="font-medium text-neutral-500">Atmosphere: </span>
                      <span className="text-neutral-700">{safePost.atmosphere}</span>
                    </div>
                  )}
                  {safePost.serviceRating && (
                    <div>
                      <span className="font-medium text-neutral-500">Service: </span>
                      <span className="text-neutral-700">{safePost.serviceRating}/5</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons - Simplified & Compact */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center space-x-3">
                  <button 
                    className={`flex items-center ${safePost.isLiked ? 'text-primary' : 'text-neutral-500'}`}
                    onClick={handleLike}
                    disabled={likeMutation.isPending}
                  >
                    <Heart className={`mr-1 h-3.5 w-3.5 ${safePost.isLiked ? 'fill-current' : ''}`} />
                    <span className="text-xs">{safePost.likeCount}</span>
                  </button>
                  <button className="flex items-center text-neutral-500">
                    <MessageCircle className="mr-1 h-3.5 w-3.5" />
                    <span className="text-xs">{safePost.comments?.length || 0}</span>
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    className={`flex items-center ${safePost.isSaved ? 'text-secondary' : 'text-neutral-500'}`}
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                  >
                    <Bookmark className={`mr-1 h-3.5 w-3.5 ${safePost.isSaved ? 'fill-current' : ''}`} />
                    <span className="text-xs">Save</span>
                  </button>
                  <SocialShare 
                    url={`${window.location.origin}/posts/${safePost.id}`}
                    title={`${safePost.author?.name || 'Someone'} recommends ${safePost.restaurant?.name || 'a restaurant'}`}
                    description={safePost.content}
                    image={safePost.images.length > 0 ? safePost.images[0] : ''}
                    contentId={safePost.id}
                    userId={user?.id ?? 0}
                    variant="icon"
                    className="text-neutral-500"
                  />
                </div>
              </div>
              
              {/* Comments Preview - Simplified */}
              {safePost.comments?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-medium text-neutral-500">
                      Latest comments
                    </h4>
                    <Link href={`/posts/${safePost.id}#comments`} className="text-xs text-primary">
                      See all
                    </Link>
                  </div>
                  {safePost.comments?.slice(0, 1).map((comment) => (
                    <div key={comment.id} className="flex items-start">
                      <Link href={`/profile/${comment.author?.id || comment.userId}`} className="block">
                        <Avatar className="w-6 h-6 mt-0.5">
                          <AvatarImage src={comment.author?.profilePicture || ''} alt={comment.author?.name || 'User'} />
                          <AvatarFallback>{comment.author?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="ml-2 flex-1">
                        <p className="text-xs">
                          <Link href={`/profile/${comment.author?.id || comment.userId}`} className="font-medium text-neutral-700 hover:underline">
                            {comment.author?.name || 'User'}
                          </Link>
                          <span className="text-neutral-600"> {comment.content}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Simplified Comment Input */}
              <form onSubmit={handleSubmitComment} className="flex items-center mt-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user?.profilePicture || ''} alt="Your profile" />
                  <AvatarFallback>{user?.name?.charAt(0) || 'Y'}</AvatarFallback>
                </Avatar>
                <div className="ml-2 flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Add a comment..."
                    className="w-full py-1 px-3 bg-neutral-100 rounded-full text-xs focus:outline-none h-7"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={commentMutation.isPending || !user}
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1.5 text-primary"
                    disabled={commentMutation.isPending || !newComment.trim() || !user}
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Post Form Dialog */}
      {isEditFormOpen && (
        <EditPostForm
          post={post}
          open={isEditFormOpen}
          onOpenChange={setIsEditFormOpen}
        />
      )}
    </>
  );
}
