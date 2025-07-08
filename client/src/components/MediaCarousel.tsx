import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';

interface MediaItem {
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
}

interface MediaCarouselProps {
  items: MediaItem[];
  className?: string;
}

export default function MediaCarousel({ items, className = "" }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!items || items.length === 0) {
    return null;
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === items.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className={`relative w-full aspect-[4/3] bg-white overflow-hidden ${className}`}>
      {/* Main Media Display */}
      <div className="relative w-full h-full">
        {items[currentIndex].type === 'image' ? (
          <img
            src={items[currentIndex].url}
            alt={`Media ${currentIndex + 1}`}
            className="w-full h-full object-cover bg-white"
            loading="lazy"
          />
        ) : (
          <video
            src={items[currentIndex].url}
            className="w-full h-full object-cover bg-white"
            controls
            preload="metadata"
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={goToPrevious}
        className="absolute top-1/2 transform -translate-y-1/2 left-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={goToNext}
        className="absolute top-1/2 transform -translate-y-1/2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}