import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { 
  ArrowLeft, Heart, MessageCircle, Bookmark, Share2, 
  MoreHorizontal, MapPin, Utensils, Globe, Users, Send
} from "lucide-react";
import { Button } from "@/components/Button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PostWithDetails } from "@/lib/types";
import { useState } from "react";
import { SocialShare } from "@/components/common/SocialShare";

export default function PostDetails() {
  const { id } = useParams();
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  
  const { data: post, isLoading } = useQuery<PostWithDetails>({
    queryKey: [`/api/posts/${id}`],
  });
  
  // Set page title
  useEffect(() => {
    if (post) {
      document.title = `${post.restaurant.name} Review | Circles`;
    }
    return () => {
      document.title = "Circles";
    };
  }, [post]);
  
  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Add like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (post?.isLiked) {
        // Unlike
        return await apiRequest("DELETE", `/api/posts/${post.id}/likes/1`);
      } else if (post) {
        // Like
        return await apiRequest("POST", "/api/likes", { postId: post.id, userId: 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
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
      if (!post) return;
      return await apiRequest("POST", "/api/comments", {
        postId: post.id,
        userId: 1, // Use current user ID in a real app
        content: newComment
      });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
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
      if (!post) return;
      return await apiRequest("POST", "/api/saved-restaurants", {
        restaurantId: post.restaurantId,
        userId: 1 // Use current user ID in a real app
      });
    },
    onSuccess: () => {
      if (!post) return;
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
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
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-3xl mx-auto px-4 py-6 md:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <a className="inline-flex items-center text-neutral-700 hover:text-neutral-900">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
            </a>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6 rounded" />
              </div>
            </div>
            <div className="px-4 pb-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
              <Skeleton className="h-4 w-56 mt-1" />
            </div>
            <Skeleton className="h-80 w-full" />
            <div className="p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-12 w-full mt-4" />
              <div className="flex justify-between mt-6">
                <div className="flex space-x-4">
                  <Skeleton className="h-8 w-16 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
                <div className="flex space-x-4">
                  <Skeleton className="h-8 w-16 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ) : post ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5 text-neutral-500" />
              </Button>
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
                  className="w-full h-96 object-cover"
                />
              </div>
            ) : post.images.length > 1 ? (
              <div className="grid grid-cols-2 gap-0.5">
                {post.images.map((image, index) => (
                  <img 
                    key={index} 
                    src={image} 
                    alt={`Post image ${index + 1}`} 
                    className="w-full h-60 object-cover"
                  />
                ))}
              </div>
            ) : null}
            
            {/* Post Content */}
            <div className="p-4">
              <p className="text-neutral-700 mb-4">{post.content}</p>
              
              {/* Dishes Tried Section */}
              {post.dishesTried && post.dishesTried.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-neutral-700 mb-2">Dishes Tried:</h4>
                  <div className="flex flex-wrap gap-2">
                    {post.dishesTried.map((dish, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-2 bg-neutral-100 text-neutral-700">
                        {dish}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Social Sharing section */}
              <div className="my-6 p-4 border border-neutral-200 rounded-lg bg-neutral-50">
                <h4 className="text-sm font-medium mb-2">Share this experience:</h4>
                <div className="flex flex-col space-y-3">
                  <p className="text-sm text-neutral-600">Let friends and followers know about this restaurant</p>
                  <SocialShare 
                    url={`${window.location.origin}/posts/${post.id}`}
                    title={`${post.author?.name || 'Someone'} recommends ${post.restaurant?.name || 'a restaurant'}`}
                    description={post.content}
                    image={post.images.length > 0 ? post.images[0] : ''}
                    contentId={post.id}
                    userId={1} // In a real app, this would be the current user's ID
                    variant="full"
                  />
                </div>
              </div>
              
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
                  <SocialShare 
                    url={`${window.location.origin}/posts/${post.id}`}
                    title={`${post.author?.name || 'Someone'} recommends ${post.restaurant?.name || 'a restaurant'}`}
                    description={post.content}
                    image={post.images.length > 0 ? post.images[0] : ''}
                    contentId={post.id}
                    userId={1}
                    variant="icon"
                    className="text-neutral-700"
                  />
                </div>
              </div>
              
              {/* Comments Section */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-4">Comments ({post.comments.length})</h4>
                {post.comments.length > 0 ? (
                  <div className="space-y-4">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start">
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
                ) : (
                  <p className="text-neutral-500 text-sm mb-4">No comments yet. Be the first to comment!</p>
                )}
              </div>
              
              {/* Add Comment Form */}
              <form onSubmit={handleSubmitComment} className="flex items-center mt-4">
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
        ) : (
          <div className="text-center py-10">
            <p className="text-neutral-700">Post not found.</p>
            <Link href="/">
              <a className="text-primary hover:underline mt-2 inline-block">
                Return to Home
              </a>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}