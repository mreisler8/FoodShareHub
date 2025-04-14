import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { 
  Heart, MessageCircle, Bookmark, Share2, 
  MoreHorizontal, MapPin, Utensils, Globe, 
  Users, Send
} from "lucide-react";
import { PostWithDetails } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface PostCardProps {
  post: PostWithDetails;
}

export function PostCard({ post }: PostCardProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  
  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Add like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (post.isLiked) {
        // Unlike
        return await apiRequest("DELETE", `/api/posts/${post.id}/likes/1`);
      } else {
        // Like
        return await apiRequest("POST", "/api/likes", { postId: post.id, userId: 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/comments", {
        postId: post.id,
        userId: 1, // Use current user ID in a real app
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
      return await apiRequest("POST", "/api/saved-restaurants", {
        restaurantId: post.restaurantId,
        userId: 1 // Use current user ID in a real app
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

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 transition-transform duration-200 hover:translate-y-[-4px]">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href={`/profile/${post.userId}`}>
            <a>
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.author?.profilePicture || ''} alt={post.author?.name || 'User'} />
                <AvatarFallback>{post.author?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </a>
          </Link>
          <div className="ml-3">
            <Link href={`/profile/${post.userId}`}>
              <a className="font-medium text-neutral-900 hover:underline">{post.author?.name || 'User'}</a>
            </Link>
            <p className="text-xs text-neutral-500 flex items-center">
              <span>{formatTimeAgo(post.createdAt)}</span>
              <span className="mx-1">•</span>
              {post.visibility === "Public" ? (
                <Globe className="text-xs mr-1 h-3 w-3" />
              ) : (
                <Users className="text-xs mr-1 h-3 w-3" />
              )}
              <span>{post.visibility}</span>
            </p>
          </div>
        </div>
        <button className="text-neutral-500">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      
      {/* Restaurant Info */}
      <div className="px-4 pb-3">
        <div className="flex items-center">
          <h3 className="text-lg font-accent">{post.restaurant?.name || 'Restaurant'}</h3>
          <div className="ml-2">
            <Rating value={post.rating} />
          </div>
        </div>
        <p className="text-sm text-neutral-700 mb-2">
          <MapPin className="inline-block mr-1 text-primary h-3 w-3" /> {post.restaurant?.location || 'Location unknown'}
        </p>
        <p className="text-sm text-neutral-700 mb-3">
          <Utensils className="inline-block mr-1 text-primary h-3 w-3" /> {post.restaurant?.category || 'Cuisine'} • {post.restaurant?.priceRange || '$'}
        </p>
      </div>
      
      {/* Post Images */}
      {post.images.length === 1 ? (
        <div className="w-full">
          <img 
            src={post.images[0]} 
            alt="Post image" 
            className="w-full h-60 object-cover"
          />
        </div>
      ) : post.images.length > 1 ? (
        <div className="grid grid-cols-2 gap-0.5">
          {post.images.slice(0, 2).map((image, index) => (
            <img 
              key={index} 
              src={image} 
              alt={`Post image ${index + 1}`} 
              className="w-full h-48 object-cover"
            />
          ))}
        </div>
      ) : null}
      
      {/* Post Content */}
      <div className="p-4">
        <p className="text-neutral-700 mb-4">{post.content}</p>
        
        {/* Dishes Tried Section */}
        {post.dishesTried && post.dishesTried.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Dishes Tried:</h4>
            <div className="flex flex-wrap gap-2">
              {post.dishesTried.map((dish, index) => (
                <span key={index} className="px-3 py-1 bg-neutral-100 rounded-full text-sm text-neutral-700">
                  {dish}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
          <div className="flex items-center space-x-4">
            <button 
              className={`flex items-center ${post.isLiked ? 'text-primary' : 'text-neutral-700'}`}
              onClick={handleLike}
              disabled={likeMutation.isPending}
            >
              <Heart className={`mr-1 h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{post.likeCount}</span>
            </button>
            <button className="flex items-center text-neutral-700">
              <MessageCircle className="mr-1 h-4 w-4" />
              <span className="text-sm">{post.comments.length}</span>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className={`flex items-center ${post.isSaved ? 'text-secondary' : 'text-neutral-700'}`}
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Bookmark className={`mr-1 h-4 w-4 ${post.isSaved ? 'fill-current' : ''}`} />
              <span className="text-sm">Save</span>
            </button>
            <button className="flex items-center text-neutral-700">
              <Share2 className="mr-1 h-4 w-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>
        
        {/* Comments Preview */}
        {post.comments.length > 0 && (
          <div className="mt-4 border-t border-neutral-200 pt-3">
            {post.comments.slice(0, 2).map((comment) => (
              <div key={comment.id} className="flex items-start mb-3">
                <Link href={`/profile/${comment.author?.id || comment.userId}`}>
                  <a>
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarImage src={comment.author?.profilePicture || ''} alt={comment.author?.name || 'User'} />
                      <AvatarFallback>{comment.author?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </a>
                </Link>
                <div className="ml-2 flex-1">
                  <p className="text-sm">
                    <Link href={`/profile/${comment.author?.id || comment.userId}`}>
                      <a className="font-medium text-neutral-900 hover:underline">{comment.author?.name || 'User'}</a>
                    </Link>
                    <span className="text-neutral-700"> {comment.content}</span>
                  </p>
                  <div className="flex items-center mt-1">
                    <button className="text-xs text-neutral-500 mr-3">Like</button>
                    <button className="text-xs text-neutral-500 mr-3">Reply</button>
                    <span className="text-xs text-neutral-500">{formatTimeAgo(comment.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Comment Input */}
        <form onSubmit={handleSubmitComment} className="flex items-center mt-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.author?.profilePicture || ''} alt="Your profile" />
            <AvatarFallback>Y</AvatarFallback>
          </Avatar>
          <div className="ml-2 flex-1 relative">
            <Input
              type="text"
              placeholder="Add a comment..."
              className="w-full py-2 px-3 bg-neutral-100 rounded-full text-sm focus:outline-none"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={commentMutation.isPending}
            />
            <button 
              type="submit"
              className="absolute right-3 top-2 text-primary"
              disabled={commentMutation.isPending || !newComment.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
