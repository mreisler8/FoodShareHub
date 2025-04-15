import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export function Rating({
  value,
  max = 5,
  size = "md",
  showValue = true,
  className,
  onChange,
  readonly = onChange ? false : true,
}: RatingProps) {
  // Generate an array representing stars to display
  const stars = Array(max)
    .fill(0)
    .map((_, i) => {
      const starValue = i + 1;
      if (value >= starValue) {
        return "full";
      } else if (value + 0.5 >= starValue) {
        return "half";
      } else {
        return "empty";
      }
    });

  const sizeClasses = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const starSizes = {
    xs: 10,
    sm: 12,
    md: 16,
    lg: 20,
  };

  const starClassName = cn(
    "text-warning",
    !readonly && "cursor-pointer hover:scale-110 transition-transform"
  );

  const handleStarClick = (starValue: number) => {
    if (!readonly && onChange) {
      onChange(starValue);
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex">
        {stars.map((type, index) => {
          const starValue = index + 1;
          return (
            <span 
              key={index} 
              className={starClassName}
              onClick={() => handleStarClick(starValue)}
              role={!readonly ? "button" : undefined}
              tabIndex={!readonly ? 0 : undefined}
            >
              {type === "full" ? (
                <Star fill="currentColor" size={starSizes[size]} />
              ) : type === "half" ? (
                <StarHalf fill="currentColor" size={starSizes[size]} />
              ) : (
                <Star size={starSizes[size]} />
              )}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className={cn("ml-1.5 text-neutral-700", sizeClasses[size])}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
