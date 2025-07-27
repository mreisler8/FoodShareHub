import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Star, Edit3, Check, X } from "lucide-react";

interface YourRatingCardProps {
  userRating?: {
    rating: number; // 10-point decimal system (0.1-10.0)
    note?: string;
    tags?: string[];
  };
  onRate?: (rating: number, note?: string, tags?: string[]) => void;
}

export function YourRatingCard({ userRating, onRate }: YourRatingCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(userRating?.rating || 0);
  const [editNote, setEditNote] = useState(userRating?.note || "");
  const [editTags, setEditTags] = useState<string[]>(userRating?.tags || []);

  const handleSave = () => {
    onRate?.(editRating, editNote, editTags);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditRating(userRating?.rating || 0);
    setEditNote(userRating?.note || "");
    setEditTags(userRating?.tags || []);
    setIsEditing(false);
  };

  if (!userRating && !isEditing) {
    return (
      <div className="rounded-xl shadow-sm bg-white p-4 space-y-4">
        <div className="text-center py-6">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your Rating</h3>
          <p className="text-sm text-muted-foreground">
            You haven't rated this restaurant yet. Use the "Quick Rate" button below to share your experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-sm bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Your Rating</h3>
        {!isEditing && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsEditing(true)}
            className="transform scale-100 transition-transform hover:scale-105 active:scale-95"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* 10-Point Rating Slider */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Rating: {editRating.toFixed(1)}/10
            </label>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={editRating}
              onChange={(e) => setEditRating(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.1</span>
              <span>5.0</span>
              <span>10.0</span>
            </div>
          </div>

          {/* Note */}
          <Textarea
            placeholder="Share your thoughts about this place..."
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            className="min-h-[80px]"
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleSave}
              className="transform scale-100 transition-transform hover:scale-105 active:scale-95"
            >
              <Check className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
              className="transform scale-100 transition-transform hover:scale-105 active:scale-95"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Display Rating - 10-Point System */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-blue-50 rounded-lg px-3 py-2">
              <Star className="h-5 w-5 text-blue-600 fill-current" />
              <span className="text-lg font-bold text-blue-700">
                {userRating?.rating?.toFixed(1)}/10
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              Your rating
            </span>
          </div>

          {/* Display Note */}
          {userRating?.note && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              "{userRating.note}"
            </p>
          )}

          {/* Display Tags */}
          {userRating?.tags && userRating.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {userRating.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}