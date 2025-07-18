// Unified post type definitions
export enum PostType {
  MOMENT = 'moment',
  DISH = 'dish',
  RESTAURANT = 'restaurant'
}

export interface PostTypeOption {
  type: PostType;
  title: string;
  description: string;
  emoji: string;
  badge?: string;
  color: string;
  features: string[];
}

export interface PostFormData {
  // Common fields
  restaurant: {
    id: string;
    name: string;
    location: string;
    source: 'database' | 'google';
  } | null;
  rating: number;
  description: string;
  media: File[];
  tags: string[];
  visibilitySettings: {
    public: boolean;
    followers: boolean;
    circleIds: number[];
  };
  taggedListIds: number[];
  
  // Type-specific fields
  dishName?: string;
  category?: string;
  priceRange?: string;
  atmosphere?: string;
  highlights?: string[];
  wouldReturn?: boolean;
}

export interface PostSubmissionData {
  postType: PostType;
  formData: PostFormData;
  userId: number;
  postId?: number; // For editing
}