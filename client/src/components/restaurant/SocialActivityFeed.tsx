import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, Heart, Star, ArrowLeft, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostMention {
  id: number;
  content: string;
  rating?: number;
  images: string[];
  createdAt: string;
  author: {
    id: number;
    name: string;
    username: string;
  };
  likeCount: number;
  commentCount: number;
  dishesTried?: string[];
  priceAssessment?: string;
  atmosphere?: string;
}

interface SocialActivityFeedProps {
  posts: PostMention[];
  restaurantName: string;
  isLoading?: boolean;
  className?: string;
}

export default function SocialActivityFeed({ 
  posts, 
  restaurantName,
  isLoading = false, 
  className 
}: SocialActivityFeedProps) {
  const [selectedPost, setSelectedPost] = useState<PostMention | null>(null);
  const [showAllPosts, setShowAllPosts] = useState(false);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 p-4 border rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Social Activity</h3>
            </div>
            
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-muted-foreground text-sm mb-2">
                None of your circles have posted about {restaurantName} yet
              </p>
              <p className="text-xs text-gray-500">
                Be the first to share your experience!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayPosts = showAllPosts ? posts : posts.slice(0, 2);

  return (
    <>
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">
                  Social Activity ({posts.length})
                </h3>
              </div>
              
              {posts.length > 2 && !showAllPosts && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAllPosts(true)}
                >
                  See All
                </Button>
              )}
            </div>

            {/* Post Snippets */}
            <div className="space-y-3">
              {displayPosts.map((post) => (
                <div
                  key={post.id}
                  className="border rounded-lg p-4 cursor-pointer hover:shadow-sm transition-all hover:border-gray-300"
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="text-sm">
                        {post.author.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{post.author.name}</span>
                        {post.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{post.rating}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">{formatTimeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                      
                      {/* Post Content Preview */}
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {post.content}
                      </p>
                      
                      {/* Dishes Tried */}
                      {post.dishesTried && post.dishesTried.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {post.dishesTried.slice(0, 2).map((dish, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                              {dish}
                            </Badge>
                          ))}
                          {post.dishesTried.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-0">
                              +{post.dishesTried.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Image Thumbnail */}
                      {post.images && post.images.length > 0 && (
                        <div className="mb-2">
                          <div className="flex gap-2">
                            <img 
                              src={post.images[0]} 
                              alt="Post image"
                              className="w-16 h-16 rounded object-cover"
                            />
                            {post.images.length > 1 && (
                              <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                +{post.images.length - 1}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Engagement */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.likeCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {post.commentCount}
                        </div>
                        <span>Tap to expand</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Show More/Less Toggle */}
            {posts.length > 2 && showAllPosts && (
              <div className="text-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAllPosts(false)}
                >
                  Show Less
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expandable Post Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedPost(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <DialogTitle className="text-sm text-muted-foreground">Post Details</DialogTitle>
            </div>
          </DialogHeader>
          
          {selectedPost && (
            <div className="space-y-4">
              {/* Author Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {selectedPost.author.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedPost.author.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    @{selectedPost.author.username} · {formatTimeAgo(selectedPost.createdAt)}
                  </p>
                </div>
              </div>
              
              {/* Rating */}
              {selectedPost.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={cn(
                          "h-5 w-5",
                          star <= selectedPost.rating! 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{selectedPost.rating}/5</span>
                </div>
              )}
              
              {/* Content */}
              <div>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.content}</p>
              </div>
              
              {/* Images */}
              {selectedPost.images && selectedPost.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedPost.images.map((image, index) => (
                    <img 
                      key={index}
                      src={image} 
                      alt={`Post image ${index + 1}`}
                      className="w-full h-32 rounded object-cover"
                    />
                  ))}
                </div>
              )}
              
              {/* Additional Details */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                {selectedPost.dishesTried && selectedPost.dishesTried.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Dishes Tried</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPost.dishesTried.map((dish, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {dish}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedPost.priceAssessment && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Price Assessment</h4>
                    <p className="text-sm text-gray-600">{selectedPost.priceAssessment}</p>
                  </div>
                )}
                
                {selectedPost.atmosphere && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Atmosphere</h4>
                    <p className="text-sm text-gray-600">{selectedPost.atmosphere}</p>
                  </div>
                )}
              </div>
              
              {/* Engagement Stats */}
              <div className="flex items-center gap-6 pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {selectedPost.likeCount} likes
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {selectedPost.commentCount} comments
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}