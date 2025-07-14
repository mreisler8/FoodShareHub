import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageSquare, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    username: string;
  };
}

interface ItemCommentsProps {
  itemId: number;
  restaurantName: string;
}

export function ItemComments({ itemId, restaurantName }: ItemCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Fetch comments for this item
  const { data: comments = [], isLoading } = useQuery({
    queryKey: [`/api/list-items/${itemId}/comments`],
    enabled: isExpanded,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(`/api/list-items/${itemId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/list-items/${itemId}/comments`] });
      setNewComment('');
      toast({
        title: 'Comment added',
        description: 'Your comment has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    addCommentMutation.mutate(newComment.trim());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mt-3 border-t pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 p-0"
      >
        <MessageSquare className="h-4 w-4" />
        <span>
          {isExpanded ? 'Hide' : 'View'} Comments ({comments.length})
        </span>
      </Button>

      {isExpanded && (
        <div className="mt-3 space-y-4">
          {/* Comments List */}
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-500">
              No comments yet. Be the first to share your thoughts about {restaurantName}!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment: Comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={``} alt={comment.author.name} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {comment.author.name}
                      </span>
                      <span className="text-gray-500">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form */}
          {user && (
            <form onSubmit={handleSubmitComment} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={``} alt={user.name} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[60px] text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {addCommentMutation.isPending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}