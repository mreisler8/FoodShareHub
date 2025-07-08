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

export default function MediaCarousel({ items, className = '' }: MediaCarouselProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!items || items.length === 0) {
    return null;
  }

  const openFullscreen = (index: number) => {
    setActiveIndex(index);
    setFullscreen(true);
  };

  const closeFullscreen = () => {
    setFullscreen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeFullscreen();
    }
  };

  return (
    <>
      {/* Main carousel */}
      <div className={`media-carousel ${className}`}>
        <Swiper
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ 
            clickable: true,
            dynamicBullets: true 
          }}
          spaceBetween={10}
          slidesPerView={1}
          className="rounded-lg overflow-hidden"
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        >
          {items.map((item, index) => (
            <SwiperSlide key={index}>
              <div 
                className="relative cursor-pointer group"
                onClick={() => openFullscreen(index)}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={`Media ${index + 1}`}
                    className="w-full h-64 md:h-96 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative">
                    <video
                      src={item.url}
                      className="w-full h-64 md:h-96 object-cover"
                      controls={false}
                      muted
                      loop
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-20 transition-all">
                      <button className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 transition-all">
                        <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Fullscreen hint */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to expand
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Thumbnail strip */}
        {items.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                  index === activeIndex 
                    ? 'border-blue-500 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={closeFullscreen}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-full max-h-full">
            {/* Close button */}
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 z-10 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Fullscreen carousel */}
            <Swiper
              modules={[Navigation, Pagination, Zoom]}
              navigation
              pagination={{ clickable: true }}
              zoom={{ maxRatio: 3 }}
              initialSlide={activeIndex}
              spaceBetween={20}
              slidesPerView={1}
              className="fullscreen-carousel"
              onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            >
              {items.map((item, index) => (
                <SwiperSlide key={index}>
                  <div className="swiper-zoom-container">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={`Fullscreen ${index + 1}`}
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                        autoPlay
                        muted
                      />
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
              {activeIndex + 1} / {items.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}