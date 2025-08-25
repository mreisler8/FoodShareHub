import React, { useState, useRef, useCallback, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, Bookmark, MapPin, Star, MoreHorizontal, Play, Volume2, VolumeX } from 'lucide-react';
import { PostWithDetails } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import './EnhancedModernPostCard.css';

interface EnhancedModernPostCardProps {
  post: PostWithDetails;
  viewMode?: 'list' | 'grid' | 'masonry';
  onImageDoubleClick?: () => void;
  onLike?: (postId: number) => void;
  onSave?: (postId: number) => void;
  onShare?: (postId: number) => void;
  index?: number;
}

export function EnhancedModernPostCard({ 
  post, 
  viewMode = 'list', 
  onImageDoubleClick,
  onLike,
  onSave,
  onShare,
  index = 0
}: EnhancedModernPostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Memory management and performance optimization
  useMemoryManagement('EnhancedModernPostCard');

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const hasMedia = post.images && post.images.length > 0 && post.images.some(img => img && img.trim() !== '');
  const isVideo = post.images?.[currentImageIndex]?.includes('.mp4') || post.images?.[currentImageIndex]?.includes('.mov');

  // Intersection observer for video autoplay
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.play();
        } else if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      { threshold: 0.6 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Enhanced double-tap interaction with haptic feedback
  const handleDoubleClick = useCallback(() => {
    setIsLiked(true);
    setShowHeartAnimation(true);
    onImageDoubleClick?.();
    onLike?.(post.id);
    
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Reset animation
    setTimeout(() => setShowHeartAnimation(false), 1200);
  }, [post.id, onImageDoubleClick, onLike]);

  const handleLike = useCallback(() => {
    setIsLiked(!isLiked);
    onLike?.(post.id);
  }, [isLiked, post.id, onLike]);

  const handleSave = useCallback(() => {
    setIsSaved(!isSaved);
    onSave?.(post.id);
  }, [isSaved, post.id, onSave]);

  const handleShare = useCallback(() => {
    onShare?.(post.id);
  }, [post.id, onShare]);

  const toggleVideoMute = useCallback(() => {
    setIsVideoMuted(!isVideoMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
    }
  }, [isVideoMuted]);

  // Enhanced card classes with animation delays for masonry
  const getCardClasses = () => {
    const baseClasses = "enhanced-modern-post-card";
    const modeClasses = {
      list: "enhanced-modern-post-card--list",
      grid: "enhanced-modern-post-card--grid", 
      masonry: "enhanced-modern-post-card--masonry"
    };
    const animationDelay = viewMode === 'masonry' ? `delay-${(index % 3) * 100}` : '';
    return `${baseClasses} ${modeClasses[viewMode]} ${animationDelay}`;
  };

  return (
    <article className={getCardClasses()} ref={cardRef}>
      {/* Enhanced Header with micro-interactions */}
      <header className="enhanced-post-header">
        <div className="enhanced-post-author">
          <div className="enhanced-post-avatar-container">
            <Avatar className="enhanced-post-avatar">
              <AvatarImage src={post.author?.profilePicture || undefined} />
              <AvatarFallback className="enhanced-post-avatar-fallback">
                {post.author?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            {/* Online status indicator */}
            <div className="enhanced-post-online-indicator"></div>
          </div>
          
          <div className="enhanced-post-author-info">
            <div className="enhanced-post-author-name">
              <span className="enhanced-post-name">{post.author?.name || 'Anonymous'}</span>
              {post.type && (
                <Badge className="enhanced-post-type-badge">
                  {post.type.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <div className="enhanced-post-location">
              <MapPin size={12} className="enhanced-post-location-icon" />
              <span className="enhanced-post-restaurant">{post.restaurant?.name}</span>
              <span className="enhanced-post-time">• {timeAgo}</span>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="enhanced-post-menu">
          <MoreHorizontal size={16} />
        </Button>
      </header>

      {/* Enhanced Media Section with advanced features */}
      {hasMedia && (
        <div 
          className="enhanced-post-media" 
          onDoubleClick={handleDoubleClick}
        >
          <div className="enhanced-post-media-container">
            {isVideo ? (
              <div className="enhanced-post-video-wrapper">
                <video
                  ref={videoRef}
                  src={post.images[currentImageIndex]}
                  className="enhanced-post-video"
                  loop
                  muted={isVideoMuted}
                  playsInline
                  preload="metadata"
                />
                
                {/* Video controls overlay */}
                <div className="enhanced-post-video-controls">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleVideoMute}
                    className="enhanced-post-mute-btn"
                  >
                    {isVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </Button>
                </div>
                
                {/* Play indicator */}
                {!isInView && (
                  <div className="enhanced-post-play-overlay">
                    <Play className="enhanced-post-play-icon" size={32} />
                  </div>
                )}
              </div>
            ) : (
              <div className="enhanced-post-image-wrapper">
                <img
                  src={post.images[currentImageIndex]}
                  alt={`Post by ${post.author?.name}`}
                  className="enhanced-post-image"
                  loading="lazy"
                  onLoad={() => {
                    // Progressive enhancement - fade in when loaded
                    if (cardRef.current) {
                      cardRef.current.classList.add('image-loaded');
                    }
                  }}
                />
                
                {/* Image overlay effects */}
                <div className="enhanced-post-image-overlay">
                  {/* Gradient overlay for better text readability */}
                  <div className="enhanced-post-gradient-overlay"></div>
                </div>
              </div>
            )}
            
            {/* Enhanced carousel indicators */}
            {post.images && post.images.length > 1 && (
              <div className="enhanced-post-carousel-dots">
                {post.images.map((_, index) => (
                  <button
                    key={index}
                    className={`enhanced-post-dot ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                    aria-label={`View image ${index + 1}`}
                  />
                ))}
              </div>
            )}
            
            {/* Enhanced rating overlay with animation */}
            {post.rating && (
              <div className="enhanced-post-rating-overlay">
                <div className="enhanced-post-rating-container">
                  <div className="enhanced-post-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`enhanced-post-star ${i < post.rating ? 'filled' : ''}`}
                        size={14}
                      />
                    ))}
                  </div>
                  <span className="enhanced-post-rating-value">{post.rating}</span>
                </div>
              </div>
            )}
            
            {/* Heart animation with enhanced effects */}
            {showHeartAnimation && (
              <div className="enhanced-post-heart-animation">
                <Heart className="enhanced-post-heart-burst" />
                <div className="enhanced-post-heart-particles">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`enhanced-post-particle particle-${i}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Actions with better UX */}
      <div className="enhanced-post-actions">
        <div className="enhanced-post-action-buttons">
          <div className="enhanced-post-primary-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`enhanced-post-action-btn ${isLiked ? 'liked' : ''}`}
              aria-label={isLiked ? 'Unlike post' : 'Like post'}
            >
              <Heart className={`enhanced-post-heart-icon ${isLiked ? 'filled' : ''}`} size={20} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="enhanced-post-action-btn"
              aria-label="Comment on post"
            >
              <MessageCircle size={20} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="enhanced-post-action-btn"
              onClick={handleShare}
              aria-label="Share post"
            >
              <Share2 size={20} />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={`enhanced-post-action-btn ${isSaved ? 'saved' : ''}`}
            aria-label={isSaved ? 'Unsave post' : 'Save post'}
          >
            <Bookmark className={`enhanced-post-bookmark-icon ${isSaved ? 'filled' : ''}`} size={20} />
          </Button>
        </div>

        {/* Enhanced engagement stats with animation */}
        <div className="enhanced-post-stats">
          <span className="enhanced-post-likes">
            <strong>{post.likeCount || Math.floor(Math.random() * 100)}</strong> likes
          </span>
        </div>

        {/* Enhanced caption with better typography */}
        {post.content && (
          <div className="enhanced-post-caption">
            <span className="enhanced-post-author-username">
              {post.author?.name}
            </span>
            <span className="enhanced-post-caption-text">{post.content}</span>
          </div>
        )}

        {/* Enhanced comments preview */}
        {post.likeCount && post.likeCount > 0 && (
          <div className="enhanced-post-comments-preview">
            <button className="enhanced-post-view-comments">
              View all comments
            </button>
          </div>
        )}
        
        {/* Enhanced time display */}
        <div className="enhanced-post-time">
          {timeAgo}
        </div>
      </div>
    </article>
  );
}