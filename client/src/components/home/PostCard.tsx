import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, Bookmark, MapPin, Star, MoreHorizontal } from 'lucide-react';
import { PostWithDetails } from '@/lib/types';
import { MediaCarousel } from '@/components/MediaCarousel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import './PostCard.css';

interface PostCardProps {
  post: PostWithDetails;
  isCompact?: boolean;
}

export function PostCard({ post, isCompact = false }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleLike = () => setIsLiked(!isLiked);
  const handleSave = () => setIsSaved(!isSaved);

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  // Check if post has valid images (not empty or broken)
  const hasMedia = post.images && post.images.length > 0 && post.images.some(img => img && img.trim() !== '');

  return (
    <Card className={`post-card ${isCompact ? 'post-card--compact' : ''}`}>
      {/* Post Header */}
      <div className="post-header">
        <div className="post-author-info">
          <Avatar className="post-avatar">
            <AvatarImage src={post.author?.profilePicture} />
            <AvatarFallback>
              {post.author?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="post-author-details">
            <div className="post-author-name">{post.author?.name || 'Anonymous'}</div>
            <div className="post-meta">
              <MapPin className="post-meta-icon" />
              <span className="post-restaurant-name">{post.restaurant?.name}</span>
              <span className="post-location">{post.restaurant?.location}</span>
              <span className="post-time">• {timeAgo}</span>
            </div>
          </div>
        </div>

        <div className="post-rating">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`star ${i < post.rating ? 'star--filled' : 'star--empty'}`}
              size={16}
            />
          ))}
          <span className="rating-value">{post.rating}</span>
        </div>
      </div>

      {/* Post Content */}
      {post.content && (
        <div className="post-content">
          <p className={`post-text ${isCompact ? 'post-text--compact' : ''}`}>
            {post.content}
          </p>
        </div>
      )}

      {/* Media Gallery */}
      {hasMedia && (
        <MediaCarousel 
          images={post.images} 
          alt={`Photos from ${post.restaurant?.name}`}
          className="post-media-carousel"
        />
      )}

      {/* Post Actions */}
      <div className="post-actions">
        <div className="post-actions-primary">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`action-button ${isLiked ? 'action-button--active' : ''}`}
          >
            <Heart className={`action-icon ${isLiked ? 'action-icon--filled' : ''}`} />
            <span>Like</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="action-button"
            onClick={() => console.log('Comment functionality would open comment modal')}
          >
            <MessageCircle className="action-icon" />
            <span>Comment</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="action-button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Check out this post about ${post.restaurant?.name}`,
                  text: post.content,
                  url: window.location.href
                }).catch(err => console.log('Error sharing:', err));
              } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            <Share2 className="action-icon" />
            <span>Share</span>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          className={`action-button ${isSaved ? 'action-button--active' : ''}`}
        >
          <Bookmark className={`action-icon ${isSaved ? 'action-icon--filled' : ''}`} />
        </Button>
      </div>

      {/* Restaurant Tags */}
      {post.restaurant?.category && (
        <div className="post-tags">
          <Badge variant="secondary" className="restaurant-category">
            {post.restaurant.category}
          </Badge>
          {post.restaurant.priceRange && (
            <Badge variant="outline" className="price-range">
              {post.restaurant.priceRange}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}