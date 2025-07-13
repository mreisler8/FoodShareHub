import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  author?: {
    id: number;
    name: string;
    username: string;
  };
}

interface CommentListProps {
  postId: number;
  showAll?: boolean;
  onToggleShowAll?: () => void;
}

export function CommentList({ postId, showAll = false, onToggleShowAll }: CommentListProps) {
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comments for this post
  const { data: comments = [], isLoading } = useQuery({
    queryKey: [`/api/posts/${postId}/comments`],
    enabled: !!postId,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/posts/${postId}/comments`, {
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await apiRequest('DELETE', `/api/comments/${commentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment on posts.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    createCommentMutation.mutate(newComment.trim());
  };

  const handleDeleteComment = (commentId: number) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return commentDate.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="mt-4 space-y-3">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
        </div>
      </div>
    );
  }

  const displayedComments = showAll ? comments : comments.slice(0, 3);
  const hasMoreComments = comments.length > 3;

  return (
    <div className="mt-4 space-y-4">
      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm">Be the first to comment!</p>
        ) : (
          <>
            {displayedComments.map((comment: Comment) => (
              <div key={comment.id} className="flex space-x-3 group">
                {/* Avatar placeholder */}
                <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {comment.author?.name?.charAt(0) || "?"}
                  </span>
                </div>
                
                {/* Comment content */}
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.author?.name || "Unknown User"}
                      </span>
                      {user && user.id === comment.userId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deleteCommentMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {formatTimeAgo(comment.createdAt)}
                  </span>
                </div>
              </div>
            ))}

            {/* Show all comments toggle */}
            {hasMoreComments && !showAll && (
              <button
                onClick={onToggleShowAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all {comments.length} comments
              </button>
            )}
          </>
        )}
      </div>

      {/* Add Comment Input */}
      {user && (
        <div className="flex space-x-3 pt-2 border-t">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">
              {user.name?.charAt(0) || "?"}
            </span>
          </div>
          <div className="flex-1 flex space-x-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="sm"
              className="px-3"
            >
              {createCommentMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}