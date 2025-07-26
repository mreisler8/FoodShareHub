import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecimalRatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  onHover?: (value: number) => void;
  hoveredValue?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DecimalRatingSlider({ 
  value, 
  onChange, 
  onHover, 
  hoveredValue, 
  size = 'md',
  className 
}: DecimalRatingSliderProps) {
  const displayValue = hoveredValue ?? value;
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  const starSize = sizeClasses[size];

  // Generate 10 stars for the 10-point scale
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      const starValue = i;
      const fillPercentage = Math.max(0, Math.min(100, (displayValue - (i - 1)) * 100));
      
      stars.push(
        <button
          key={i}
          type="button"
          className={cn(
            "relative transition-all duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded",
            starSize
          )}
          onClick={() => onChange(starValue)}
          onMouseEnter={() => onHover?.(starValue)}
          onMouseLeave={() => onHover?.(0)}
          aria-label={`Rate ${starValue} out of 10`}
        >
          {/* Background star */}
          <Star 
            className={cn(
              "absolute inset-0 text-gray-300",
              starSize
            )}
          />
          {/* Filled portion */}
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${fillPercentage}%` }}
          >
            <Star 
              className={cn(
                "text-yellow-400 fill-yellow-400",
                starSize
              )}
            />
          </div>
        </button>
      );
    }
    return stars;
  };

  // Handle slider input for precise decimal selection
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Star display */}
      <div className="flex items-center gap-1">
        {renderStars()}
      </div>
      
      {/* Precise decimal slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>0.1</span>
          <span className="font-medium text-base">
            {displayValue > 0 ? displayValue.toFixed(1) : '0.0'}
          </span>
          <span>10.0</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="10.0"
          step="0.1"
          value={value}
          onChange={handleSliderChange}
          onMouseMove={(e) => {
            if (onHover) {
              const rect = e.currentTarget.getBoundingClientRect();
              const percentage = (e.clientX - rect.left) / rect.width;
              const sliderValue = Math.max(0.1, Math.min(10.0, 0.1 + percentage * 9.9));
              onHover(Math.round(sliderValue * 10) / 10);
            }
          }}
          onMouseLeave={() => onHover?.(0)}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, 
              #fbbf24 0%, 
              #fbbf24 ${((value - 0.1) / 9.9) * 100}%, 
              #e5e7eb ${((value - 0.1) / 9.9) * 100}%, 
              #e5e7eb 100%)`
          }}
        />
      </div>
      
      {/* Rating description */}
      <div className="text-center text-sm text-gray-600">
        {displayValue === 0 && "Select a rating"}
        {displayValue > 0 && displayValue <= 2 && "Poor"}
        {displayValue > 2 && displayValue <= 4 && "Fair"} 
        {displayValue > 4 && displayValue <= 6 && "Good"}
        {displayValue > 6 && displayValue <= 8 && "Very Good"}
        {displayValue > 8 && displayValue <= 10 && "Excellent"}
      </div>
    </div>
  );
}