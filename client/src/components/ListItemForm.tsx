import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ListItemFormProps {
  restaurantId: string;
  restaurantName: string;
  initial?: {
    rating?: number | null;
    liked?: string | null;
    disliked?: string | null;
    notes?: string | null;
  };
  onSave: (data: { rating: number; liked: string; disliked: string; notes: string }) => void;
  onCancel: () => void;
}

// StarRating component for 1-5 stars
interface StarRatingProps {
  value: number | null;
  onChange: (rating: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-1 hover:scale-110 transition-transform"
        >
          <Star
            className={`h-5 w-5 ${
              value && star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-200'
            }`}
          />
        </button>
      ))}
      {value && (
        <span className="ml-2 text-sm text-gray-600">
          {value} star{value !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

export function ListItemForm({ restaurantId, restaurantName, initial, onSave, onCancel }: ListItemFormProps) {
  const [rating, setRating] = useState<number | null>(initial?.rating || null);
  const [liked, setLiked] = useState(initial?.liked || '');
  const [disliked, setDisliked] = useState(initial?.disliked || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  const handleSave = () => {
    if (rating === null) return;
    
    onSave({
      rating: rating,
      liked,
      disliked,
      notes
    });
  };

  return (
    <div className="inline-form bg-white border rounded-lg p-4 shadow-sm space-y-4">
      <div className="border-b pb-2">
        <h3 className="font-medium text-gray-900">Add {restaurantName} to your list</h3>
        <p className="text-sm text-gray-500">Share your experience with this restaurant</p>
      </div>
      
      <div className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* What I liked */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What I liked
          </label>
          <Input
            placeholder="What did you enjoy about this restaurant?"
            value={liked}
            onChange={(e) => setLiked(e.target.value)}
          />
        </div>

        {/* What I didn't like */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What I didn't like
          </label>
          <Input
            placeholder="What could be improved?"
            value={disliked}
            onChange={(e) => setDisliked(e.target.value)}
          />
        </div>

        {/* Additional notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional notes
          </label>
          <Textarea
            placeholder="Any other thoughts or recommendations?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            disabled={rating === null}
            onClick={handleSave}
          >
            Save to List
          </Button>
        </div>
      </div>
    </div>
  );
}