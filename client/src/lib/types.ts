import { User, Restaurant, Post, Comment, Circle, Like, Story, RestaurantList as BaseRestaurantList, RestaurantListItem } from "@shared/schema";

// Extended types for frontend use

export interface UserWithStats extends User {
  postCount?: number;
  followersCount?: number;
  followingCount?: number;
}

export interface PostWithDetails {
  id: number;
  userId: number;
  restaurantId: number;
  content: string;
  rating: number;
  visibility: string;
  dishesTried: string[];
  images: string[];
  createdAt: Date;
  author: User;
  restaurant: Restaurant;
  comments: CommentWithAuthor[];
  likeCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  priceAssessment?: string;
  atmosphere?: string;
  serviceRating?: number;
  dietaryOptions?: string[];
}

export interface CommentWithAuthor extends Comment {
  author: User;
}

export interface CircleWithStats extends Circle {
  memberCount: number;
  postCount?: number;
  trending?: boolean;
}

// Alias for backward compatibility
export type HubWithStats = CircleWithStats;

export interface StoryGroup {
  userId: number;
  userName: string;
  profilePicture?: string;
  stories: Story[];
}

export interface FriendActivity {
  id: number;
  userId: number;
  userName: string;
  profilePicture?: string;
  activityType: 'rated' | 'joined' | 'posted';
  targetName: string;
  targetId: number;
  timeAgo: string;
  rating?: number;
}

export interface PopularRestaurant {
  id: number;
  name: string;
  category: string;
  priceRange: string;
  image: string;
  rating: number;
  reviewCount: number;
}

export interface RestaurantList extends BaseRestaurantList {
  restaurantCount?: number;
  circleName?: string;
  creator?: User;
  circle?: Circle;
  restaurants?: RestaurantListItemWithDetails[];
}

export interface RestaurantListItemWithDetails extends RestaurantListItem {
  restaurant?: Restaurant;
  addedBy?: User;
}
