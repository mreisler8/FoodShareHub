import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { 
  Heart, MessageCircle, Bookmark, Globe, 
  Users, MapPin, Utensils, MoreHorizontal
} from "lucide-react";
import { PostWithDetails } from "@/lib/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
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
import MediaCarousel from "@/components/MediaCarousel";
import "./PostCard.css";

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
    return (
      <div className="post-card-skeleton">
        <div className="animate-pulse bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
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
        const response = await apiRequest("DELETE", `/api/posts/${post.id}/likes`);
        return response.json();
      } else {
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
      <article className="post-card">
        {/* Post Header */}
        <header className="post-header">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.userId}`} className="user-avatar">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.author?.profilePicture || ''} alt={post.author?.name || 'User'} />
                <AvatarFallback className="text-sm font-medium">
                  {post.author?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${post.userId}`} className="user-name">
                  {post.author?.name || 'User'}
                </Link>
                <span className="post-time">
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Rating value={post.rating} size="xs" />
                <span className="visibility-icon">
                  {post.visibility === "public" ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Users className="h-3 w-3" />
                  )}
                </span>
              </div>
            </div>
          </div>
          <PostActions 
            post={post} 
            onEditClick={handleEditClick}
            onAddToListClick={() => setIsAddToListOpen(true)}
          />
        </header>

        {/* Restaurant Name - Primary Focus */}
        <div className="restaurant-info">
          <Link href={`/restaurants/${post.restaurantId}`}>
            <h2 className="restaurant-name">
              {post.restaurant?.name || 'Restaurant'}
            </h2>
          </Link>
          <div className="restaurant-details">
            <span className="location">
              <MapPin className="h-4 w-4" />
              {post.restaurant?.location || 'Location unknown'}
            </span>
            <span className="cuisine">
              <Utensils className="h-4 w-4" />
              {post.restaurant?.category || 'Cuisine'}
            </span>
            <span className="price-range">
              {post.restaurant?.priceRange || '$'}
            </span>
          </div>
          <div className="mt-3">
            <TrustIndicators 
              restaurantId={post.restaurantId} 
              type="restaurant" 
              size="sm" 
            />
          </div>
        </div>

        {/* Post Media */}
        {((post.images && post.images.length > 0) || (post.videos && post.videos.length > 0)) && (
          <div className="post-media">
            <MediaCarousel 
              items={[
                ...(post.images || []).map(url => ({ url, type: 'image' as const })),
                ...(post.videos || []).map(url => ({ url, type: 'video' as const }))
              ]} 
              className="media-carousel"
            />
          </div>
        )}

        {/* Post Content */}
        <div className="post-content">
          <p className="content-text">{post.content}</p>

          {/* List Tags */}
          <ListTagDisplay lists={postLists} className="mt-3" />

          {/* Dishes Tried */}
          {dishesTried.length > 0 && (
            <div className="dishes-section">
              <h4 className="dishes-label">Dishes tried:</h4>
              <div className="dishes-list">
                {dishesTried.map((dish: string, index: number) => (
                  <span key={index} className="dish-tag">
                    {dish}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {(post.priceAssessment || post.atmosphere || post.serviceRating) && (
            <div className="additional-details">
              {post.priceAssessment && (
                <div className="detail-item">
                  <span className="detail-label">Price:</span>
                  <span className="detail-value">{post.priceAssessment}</span>
                </div>
              )}
              {post.atmosphere && (
                <div className="detail-item">
                  <span className="detail-label">Atmosphere:</span>
                  <span className="detail-value">{post.atmosphere}</span>
                </div>
              )}
              {post.serviceRating && (
                <div className="detail-item">
                  <span className="detail-label">Service:</span>
                  <span className="detail-value">{post.serviceRating}/5</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Actions */}
        <div className="post-actions">
          <div className="action-buttons">
            <button 
              className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending || !user}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{localLikeCount}</span>
            </button>

            <button 
              className="action-btn comment-btn"
              onClick={() => setShowAllComments(!showAllComments)}
            >
              <MessageCircle className="h-5 w-5" />
              <span>{comments.length}</span>
            </button>

            <button 
              className={`action-btn save-btn ${post.isSaved ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Bookmark className={`h-5 w-5 ${post.isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>

          <SocialShare 
            url={`${window.location.origin}/posts/${post.id}`}
            title={`Check out this review of ${post.restaurant?.name}`}
            description={post.content}
          />
        </div>

        {/* Comments Section */}
        {showAllComments && (
          <div className="comments-section">
            <CommentList 
              postId={post.id}
              comments={comments}
              onCommentUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
              }}
            />
          </div>
        )}
      </article>

      {/* Edit Modal */}
      <PostModal 
        isOpen={isEditFormOpen}
        onClose={() => setIsEditFormOpen(false)}
        post={post}
        isEditMode={true}
      />

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={isAddToListOpen}
        onClose={() => setIsAddToListOpen(false)}
        postId={post.id}
      />
    </>
  );
}