import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Heart, Share2, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PostMention {
  id: number;
  content: string;
  rating?: number;
  images?: string[];
  author: {
    id: number;
    name: string;
    username: string;
    profileImage?: string;
  };
  createdAt: string;
  likes?: number;
  comments?: number;
  dishName?: string;
}

interface PostMentionsCardProps {
  posts: PostMention[];
  onViewPost?: (postId: number) => void;
  onViewProfile?: (userId: number) => void;
}

export function PostMentionsCard({ posts, onViewPost, onViewProfile }: PostMentionsCardProps) {
  const [selectedPost, setSelectedPost] = useState<PostMention | null>(null);

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-xl shadow-sm bg-white p-4 space-y-4">
        <div className="text-center py-6">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No posts yet from your Circles — be the first!
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Use the "Quick Rate" button below to share your experience
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-sm bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Recent Posts</h3>
        <Badge variant="secondary">{posts.length}</Badge>
      </div>

      <div className="space-y-3">
        {posts.slice(0, 3).map((post) => (
          <div
            key={post.id}
            className="p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
            onClick={() => setSelectedPost(post)}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile?.(post.author.id);
                }}
                className="flex-none"
              >
                {post.author.profileImage ? (
                  <img
                    src={post.author.profileImage}
                    alt={post.author.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{post.author.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt))} ago
                  </span>
                  {post.rating && (
                    <Badge variant="outline" className="text-xs">
                      ⭐ {post.rating}
                    </Badge>
                  )}
                </div>

                {post.dishName && (
                  <p className="text-sm font-medium text-blue-600 mb-1">
                    {post.dishName}
                  </p>
                )}

                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                  {post.content}
                </p>

                {/* Image thumbnail */}
                {post.images && post.images.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {post.images.slice(0, 3).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt=""
                        className="w-12 h-12 rounded object-cover"
                      />
                    ))}
                    {post.images.length > 3 && (
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium">
                          +{post.images.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Engagement */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {post.likes && post.likes > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.likes}
                    </span>
                  )}
                  {post.comments && post.comments > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {post.comments}
                    </span>
                  )}
                  <span className="ml-auto text-blue-600 font-medium">
                    Tap to expand →
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {posts.length > 3 && (
          <Button variant="ghost" size="sm" className="w-full">
            View all {posts.length} posts →
          </Button>
        )}
      </div>

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedPost.author.profileImage ? (
                    <img
                      src={selectedPost.author.profileImage}
                      alt={selectedPost.author.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{selectedPost.author.name}</span>
                    <p className="text-sm text-muted-foreground font-normal">
                      {formatDistanceToNow(new Date(selectedPost.createdAt))} ago
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedPost.dishName && (
                  <h3 className="text-lg font-medium text-blue-600">
                    {selectedPost.dishName}
                  </h3>
                )}

                {selectedPost.rating && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-lg ${
                          star <= selectedPost.rating! ? 'text-yellow-500' : 'text-gray-300'
                        }`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-gray-700 leading-relaxed">
                  {selectedPost.content}
                </p>

                {selectedPost.images && selectedPost.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPost.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt=""
                        className="w-full h-48 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button size="sm" variant="outline">
                    <Heart className="h-4 w-4 mr-2" />
                    Like
                  </Button>
                  <Button size="sm" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Comment
                  </Button>
                  <Button size="sm" variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}