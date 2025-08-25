import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostWithDetails } from '@/lib/types';
import './BestInClassFeedEnhancements.css';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-cards';

interface BestInClassFeedEnhancementsProps {
  posts: PostWithDetails[];
  onLike?: (postId: number) => void;
  onSave?: (postId: number) => void;
  onShare?: (postId: number) => void;
}

// Enhanced Story Creator with Instagram-quality features
export function StoryCreator({ onCreateStory }: { onCreateStory?: () => void }) {
  return (
    <motion.div 
      className="story-creator"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onCreateStory}
    >
      <div className="story-creator-gradient">
        <div className="story-creator-plus">+</div>
      </div>
      <span className="story-creator-label">Your Story</span>
    </motion.div>
  );
}

// Enhanced Stories Section with advanced interactions
export function EnhancedStoriesSection({ 
  stories = [],
  onCreateStory,
  onViewStory 
}: {
  stories?: any[];
  onCreateStory?: () => void;
  onViewStory?: (storyId: string) => void;
}) {
  return (
    <div className="enhanced-stories-section">
      <div className="enhanced-stories-container">
        <StoryCreator onCreateStory={onCreateStory} />
        
        {stories.map((story, index) => (
          <motion.div
            key={story.id}
            className={`enhanced-story-item ${story.hasViewed ? 'viewed' : 'unviewed'}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewStory?.(story.id)}
          >
            <div className="enhanced-story-ring">
              <Avatar className="enhanced-story-avatar">
                <AvatarImage src={story.user.avatar || story.preview} />
                <AvatarFallback>{story.user.name[0]}</AvatarFallback>
              </Avatar>
            </div>
            <span className="enhanced-story-username">{story.user.name.split(' ')[0]}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Premium Video Player with TikTok-style controls
export function PremiumVideoPlayer({ 
  src, 
  poster,
  autoPlay = true,
  onLike 
}: {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onLike?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleDoubleClick = useCallback(() => {
    setIsLiked(true);
    onLike?.();
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setTimeout(() => setIsLiked(false), 1000);
  }, [onLike]);

  return (
    <div 
      className="premium-video-player"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onDoubleClick={handleDoubleClick}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="premium-video"
        loop
        muted={isMuted}
        autoPlay={autoPlay}
        playsInline
      />
      
      {/* Video Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="premium-video-controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="premium-video-mute-btn"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heart Animation */}
      <AnimatePresence>
        {isLiked && (
          <motion.div
            className="premium-video-heart"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Heart className="premium-heart-icon" fill="currentColor" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Instagram-style Image Carousel with smooth transitions
export function InstagramImageCarousel({ 
  images, 
  onDoubleClick 
}: {
  images: string[];
  onDoubleClick?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="instagram-carousel">
      <Swiper
        spaceBetween={0}
        slidesPerView={1}
        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
        pagination={{ 
          clickable: true,
          bulletClass: 'instagram-pagination-bullet',
          bulletActiveClass: 'instagram-pagination-bullet-active'
        }}
        className="instagram-swiper"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <motion.img
              src={image}
              alt={`Slide ${index + 1}`}
              className="instagram-carousel-image"
              onDoubleClick={onDoubleClick}
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom Pagination Dots */}
      {images.length > 1 && (
        <div className="instagram-pagination">
          {images.map((_, index) => (
            <button
              key={index}
              className={`instagram-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Pinterest-style Masonry Layout with advanced animations
export function PinterestMasonryLayout({ 
  posts,
  onPostClick 
}: {
  posts: PostWithDetails[];
  onPostClick?: (post: PostWithDetails) => void;
}) {
  return (
    <div className="pinterest-masonry">
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          className="pinterest-masonry-item"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ 
            y: -8,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
          }}
          onClick={() => onPostClick?.(post)}
        >
          {post.images?.[0] && (
            <img
              src={post.images[0]}
              alt={`Post by ${post.author?.name}`}
              className="pinterest-image"
              loading="lazy"
            />
          )}
          
          <div className="pinterest-overlay">
            <div className="pinterest-actions">
              <Button variant="ghost" size="sm" className="pinterest-action">
                <Heart size={16} />
              </Button>
              <Button variant="ghost" size="sm" className="pinterest-action">
                <Share2 size={16} />
              </Button>
              <Button variant="ghost" size="sm" className="pinterest-action">
                <Bookmark size={16} />
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// TikTok-style Vertical Feed with gesture support
export function TikTokVerticalFeed({ 
  posts,
  onSwipeUp,
  onSwipeDown 
}: {
  posts: PostWithDetails[];
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipe = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      onSwipeUp?.();
    } else if (direction === 'down' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      onSwipeDown?.();
    }
  }, [currentIndex, posts.length, onSwipeUp, onSwipeDown]);

  return (
    <div className="tiktok-vertical-feed">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="tiktok-post-container"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 0.3 }}
        >
          {posts[currentIndex] && (
            <div className="tiktok-post">
              {/* Post content */}
              <div className="tiktok-content">
                {posts[currentIndex].images?.[0] && (
                  <img
                    src={posts[currentIndex].images[0]}
                    alt="Post content"
                    className="tiktok-media"
                  />
                )}
              </div>
              
              {/* Side Actions */}
              <div className="tiktok-actions">
                <motion.button
                  className="tiktok-action-btn"
                  whileTap={{ scale: 0.9 }}
                >
                  <Heart size={24} />
                  <span>12.3K</span>
                </motion.button>
                
                <motion.button
                  className="tiktok-action-btn"
                  whileTap={{ scale: 0.9 }}
                >
                  <MessageCircle size={24} />
                  <span>234</span>
                </motion.button>
                
                <motion.button
                  className="tiktok-action-btn"
                  whileTap={{ scale: 0.9 }}
                >
                  <Share2 size={24} />
                  <span>89</span>
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Swipe Indicators */}
      <div className="tiktok-swipe-indicators">
        <button 
          onClick={() => handleSwipe('down')}
          className="tiktok-swipe-btn"
          disabled={currentIndex === 0}
        >
          ↑
        </button>
        <button 
          onClick={() => handleSwipe('up')}
          className="tiktok-swipe-btn"
          disabled={currentIndex === posts.length - 1}
        >
          ↓
        </button>
      </div>
    </div>
  );
}

// AI-Powered Content Recommendations
export function AIContentRecommendations({ 
  userId,
  onRecommendationClick 
}: {
  userId: number;
  onRecommendationClick?: (recommendation: any) => void;
}) {
  const [recommendations, setRecommendations] = useState([]);

  return (
    <div className="ai-recommendations">
      <div className="ai-recommendations-header">
        <Zap className="ai-icon" />
        <span>Recommended for you</span>
      </div>
      
      <div className="ai-recommendations-grid">
        {recommendations.map((rec: any, index) => (
          <motion.div
            key={index}
            className="ai-recommendation-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => onRecommendationClick?.(rec)}
          >
            {/* Recommendation content */}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function BestInClassFeedEnhancements({ 
  posts,
  onLike,
  onSave,
  onShare 
}: BestInClassFeedEnhancementsProps) {
  return (
    <div className="best-in-class-feed">
      <EnhancedStoriesSection />
      <PinterestMasonryLayout posts={posts} />
      <AIContentRecommendations userId={1} />
    </div>
  );
}