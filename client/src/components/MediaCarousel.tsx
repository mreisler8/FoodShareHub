
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

  if (!images || images.length === 0) {
    return null;
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const currentImage = images[currentIndex];
  const hasError = imageErrors[currentIndex];

  return (
    <>
      <div className={`media-carousel ${className}`}>
        <div className="media-carousel-container">
          {hasError ? (
            <div className="media-error-state">
              <span>Image unavailable</span>
            </div>
          ) : (
            <img
              src={currentImage}
              alt={`${alt} ${currentIndex + 1}`}
              className="media-carousel-image"
              onError={() => handleImageError(currentIndex)}
              onClick={() => setIsFullscreen(true)}
            />
          )}

          {images.length > 1 && !hasError && (
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
                {images.map((_, index) => (
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
          aspect-ratio: 4/3;
          background: #f8fafc;
          border-radius: 0;
          overflow: hidden;
        }

        .media-carousel-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .media-carousel-image:hover {
          transform: scale(1.02);
        }

        .media-error-state {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.875rem;
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
