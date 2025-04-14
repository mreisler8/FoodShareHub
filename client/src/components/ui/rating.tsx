import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function Rating({
  value,
  max = 5,
  size = "md",
  showValue = true,
  className,
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
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const starSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const starClassName = "text-warning";

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex">
        {stars.map((type, index) => (
          <span key={index} className={starClassName}>
            {type === "full" ? (
              <Star fill="currentColor" size={starSizes[size]} />
            ) : type === "half" ? (
              <StarHalf fill="currentColor" size={starSizes[size]} />
            ) : (
              <Star size={starSizes[size]} />
            )}
          </span>
        ))}
      </div>
      {showValue && (
        <span className={cn("ml-2 text-neutral-700", sizeClasses[size])}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
