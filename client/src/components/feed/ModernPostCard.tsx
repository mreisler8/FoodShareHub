import React, { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, Bookmark, MapPin, Star, MoreHorizontal, Play } from 'lucide-react';
import { PostWithDetails } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
// import { PostTypeIcon, getPostTypeColor, getPostTypeLabel } from '@/components/post/PostTypeIcon';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import './ModernPostCard.css';

interface ModernPostCardProps {
  post: PostWithDetails;
  viewMode?: 'list' | 'grid' | 'masonry';
  onImageDoubleClick?: () => void;
}

export function ModernPostCard({ post, viewMode = 'list', onImageDoubleClick }: ModernPostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Memory management for performance
  useMemoryManagement('ModernPostCard');

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const hasMedia = post.images && post.images.length > 0 && post.images.some(img => img && img.trim() !== '');
  const isVideo = post.images?.[currentImageIndex]?.includes('.mp4') || post.images?.[currentImageIndex]?.includes('.mov');

  const handleDoubleClick = () => {
    setIsLiked(true);
    setShowHeartAnimation(true);
    onImageDoubleClick?.();
    
    // Reset animation after completion
    setTimeout(() => setShowHeartAnimation(false), 1000);
  };

  const handleLike = () => setIsLiked(!isLiked);
  const handleSave = () => setIsSaved(!isSaved);

  const getCardClasses = () => {
    const baseClasses = "modern-post-card";
    const modeClasses = {
      list: "modern-post-card--list",
      grid: "modern-post-card--grid", 
      masonry: "modern-post-card--masonry"
    };
    return `${baseClasses} ${modeClasses[viewMode]}`;
  };

  return (
    <article className={getCardClasses()} ref={cardRef}>
      {/* Header with author info */}
      <header className="modern-post-header">
        <div className="modern-post-author">
          <Avatar className="modern-post-avatar">
            <AvatarImage src={post.author?.profilePicture || undefined} />
            <AvatarFallback className="modern-post-avatar-fallback">
              {post.author?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="modern-post-author-info">
            <div className="modern-post-author-name">
              {post.author?.name || 'Anonymous'}
              {post.type && (
                <Badge className="modern-post-type-badge bg-primary/10 text-primary">
                  {post.type.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="modern-post-location">
              <MapPin size={12} />
              <span>{post.restaurant?.name}</span>
              <span className="modern-post-time">• {timeAgo}</span>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="modern-post-menu">
          <MoreHorizontal size={16} />
        </Button>
      </header>

      {/* Image/Media Section */}
      {hasMedia && (
        <div 
          className="modern-post-media" 
          onDoubleClick={handleDoubleClick}
        >
          <div className="modern-post-image-container">
            {isVideo ? (
              <div className="modern-post-video">
                <video
                  src={post.images[currentImageIndex]}
                  className="modern-post-video-element"
                  loop
                  muted
                  playsInline
                />
                <div className="modern-post-video-overlay">
                  <Play className="modern-post-play-icon" />
                </div>
              </div>
            ) : (
              <img
                src={post.images[currentImageIndex]}
                alt={`Post by ${post.author?.name}`}
                className="modern-post-image"
                loading="lazy"
              />
            )}
            
            {/* Image carousel indicators */}
            {post.images && post.images.length > 1 && (
              <div className="modern-post-carousel-dots">
                {post.images.map((_, index) => (
                  <button
                    key={index}
                    className={`modern-post-dot ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            )}
            
            {/* Rating overlay */}
            <div className="modern-post-rating-overlay">
              <div className="modern-post-stars">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`modern-post-star ${i < post.rating ? 'filled' : ''}`}
                    size={14}
                  />
                ))}
                <span className="modern-post-rating-value">{post.rating}</span>
              </div>
            </div>
            
            {/* Heart animation */}
            {showHeartAnimation && (
              <div className="modern-post-heart-animation">
                <Heart className="modern-post-heart-icon" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="modern-post-actions">
        <div className="modern-post-action-buttons">
          <div className="modern-post-primary-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`modern-post-action-btn ${isLiked ? 'liked' : ''}`}
            >
              <Heart className={isLiked ? 'fill-current' : ''} size={20} />
            </Button>
            <Button variant="ghost" size="sm" className="modern-post-action-btn">
              <MessageCircle size={20} />
            </Button>
            <Button variant="ghost" size="sm" className="modern-post-action-btn">
              <Share2 size={20} />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={`modern-post-action-btn ${isSaved ? 'saved' : ''}`}
          >
            <Bookmark className={isSaved ? 'fill-current' : ''} size={20} />
          </Button>
        </div>

        {/* Engagement stats */}
        <div className="modern-post-stats">
          <span className="modern-post-likes">
            {Math.floor(Math.random() * 100)} likes
          </span>
        </div>

        {/* Caption */}
        {post.content && (
          <div className="modern-post-caption">
            <span className="modern-post-author-username">{post.author?.name}</span>
            <span className="modern-post-caption-text">{post.content}</span>
          </div>
        )}

        {/* Comments preview */}
        {post.likeCount && post.likeCount > 0 && (
          <div className="modern-post-comments-preview">
            <button className="modern-post-view-comments">
              View all comments
            </button>
          </div>
        )}
        
        {/* Time */}
        <div className="modern-post-time">
          {timeAgo}
        </div>
      </div>
    </article>
  );
}