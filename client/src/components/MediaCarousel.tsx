
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MediaCarouselProps {
  images: string[];
  alt?: string;
  className?: string;
}

export function MediaCarousel({ images, alt = "Media", className = "" }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Filter out empty or invalid image URLs
  const validImages = images?.filter(img => img && img.trim() !== '') || [];
  
  if (validImages.length === 0) {
    return null;
  }

  // Check if all valid images have failed to load
  const allImagesFailedToLoad = validImages.every((_, index) => imageErrors[index]);
  
  if (allImagesFailedToLoad) {
    return null;
  }

  const nextImage = () => {
    setCurrentIndex((prev) => findNextValidImage(prev + 1));
  };

  const prevImage = () => {
    setCurrentIndex((prev) => findNextValidImage(prev - 1 + validImages.length));
  };

  const handleImageError = (index: number) => {
    console.log('Image loading failed for index:', index, 'URL:', validImages[index]);
    setImageErrors(prev => {
      const newErrors = { ...prev, [index]: true };
      
      // If current image failed and this is the current index, find next valid image
      if (index === currentIndex) {
        const nextValidIndex = findNextValidImage(index + 1);
        if (nextValidIndex !== index) {
          setTimeout(() => setCurrentIndex(nextValidIndex), 0);
        }
      }
      
      return newErrors;
    });
  };

  // Skip to next valid image if current one has error
  const findNextValidImage = (startIndex: number) => {
    for (let i = 0; i < validImages.length; i++) {
      const index = (startIndex + i) % validImages.length;
      if (!imageErrors[index]) {
        return index;
      }
    }
    return startIndex; // fallback
  };

  const currentImage = validImages[currentIndex];
  const hasError = imageErrors[currentIndex];

  return (
    <>
      <div className={`media-carousel ${className}`}>
        <div className="media-carousel-container">
          {hasError ? (
            null // Don't show error state, component will hide if all images fail
          ) : (
            <img
              src={currentImage}
              alt={`${alt} ${currentIndex + 1}`}
              className="media-carousel-image"
              onError={() => handleImageError(currentIndex)}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                console.log('Image loaded:', img.naturalWidth, 'x', img.naturalHeight);
                if (img.naturalWidth < 10 || img.naturalHeight < 10) {
                  handleImageError(currentIndex);
                }
              }}
              onClick={() => setIsFullscreen(true)}
            />
          )}

          {validImages.length > 1 && !hasError && (
            <>
              <button
                onClick={prevImage}
                className="media-carousel-nav media-carousel-nav--prev"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={nextImage}
                className="media-carousel-nav media-carousel-nav--next"
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>

              <div className="media-carousel-indicators">
                {validImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`media-carousel-indicator ${
                      index === currentIndex ? 'media-carousel-indicator--active' : ''
                    }`}
                    aria-label={`View image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && !hasError && (
        <div className="media-fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
          <div className="media-fullscreen-container">
            <button
              onClick={() => setIsFullscreen(false)}
              className="media-fullscreen-close"
              aria-label="Close fullscreen"
            >
              <X size={24} />
            </button>
            <img
              src={currentImage}
              alt={`${alt} ${currentIndex + 1}`}
              className="media-fullscreen-image"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .media-carousel {
          position: relative;
          width: 100%;
        }

        .media-carousel-container {
          position: relative;
          width: 100%;
          min-height: 200px;
          background: #ffffff !important;
          border-radius: 0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .media-carousel-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease;
          background: white;
        }

        .media-carousel-image:hover {
          transform: scale(1.02);
        }

        .media-error-state {
          width: 100%;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff !important;
          color: #64748b;
          font-size: 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .media-carousel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.7);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 2;
        }

        .media-carousel-nav:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: translateY(-50%) scale(1.1);
        }

        .media-carousel-nav:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .media-carousel-nav--prev {
          left: 0.75rem;
        }

        .media-carousel-nav--next {
          right: 0.75rem;
        }

        .media-carousel-indicators {
          position: absolute;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.5rem;
          z-index: 2;
        }

        .media-carousel-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .media-carousel-indicator--active {
          background: white;
          transform: scale(1.25);
        }

        .media-fullscreen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .media-fullscreen-container {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }

        .media-fullscreen-close {
          position: absolute;
          top: -50px;
          right: 0;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background 0.2s ease;
        }

        .media-fullscreen-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .media-fullscreen-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        @media (max-width: 768px) {
          .media-carousel-nav {
            width: 32px;
            height: 32px;
          }

          .media-carousel-nav--prev {
            left: 0.5rem;
          }

          .media-carousel-nav--next {
            right: 0.5rem;
          }
        }
      `}</style>
    </>
  );
}
