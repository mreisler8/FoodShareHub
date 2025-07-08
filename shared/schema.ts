import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  profilePicture: text("profile_picture"),
  // Dining preferences for personalized suggestions
  preferredCuisines: text("preferred_cuisines").array(),
  preferredPriceRange: text("preferred_price_range"),
  preferredLocation: text("preferred_location"),
  diningInterests: text("dining_interests").array(), // e.g., ["fine-dining", "casual", "street-food"]
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  bio: true,
  profilePicture: true,
});

// Restaurant model
export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(), // City name (e.g., "Toronto")
  category: text("category").notNull(),
  priceRange: text("price_range").notNull(),
  // External service fields
  openTableId: text("opentable_id"),
  resyId: text("resy_id"),
  googlePlaceId: text("google_place_id"),
  // Location-based discovery fields
  address: text("address"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("US"),
  postalCode: text("postal_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  // Additional details
  phone: text("phone"),
  website: text("website"),
  cuisine: text("cuisine"),
  hours: text("hours"),
  description: text("description"),
  imageUrl: text("image_url"),
  // Tracking fields
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).pick({
  name: true,
  location: true,
  category: true,
  priceRange: true,
  // External service fields
  openTableId: true,
  resyId: true,
  googlePlaceId: true,
  // Location fields
  address: true,
  neighborhood: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  // Details
  phone: true,
  website: true,
  cuisine: true,
  hours: true,
  description: true,
  imageUrl: true,
});

// Post model
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  visibility: text("visibility").notNull(),
  dishesTried: text("dishes_tried").array(),
  images: text("images").array().default([]),
  videos: text("videos").array().default([]),
  imageTags: text("image_tags").array().default([]),
  priceAssessment: text("price_assessment"), // "great value", "overpriced", "fair"
  atmosphere: text("atmosphere"), // "quiet", "lively", "romantic", etc.
  serviceRating: integer("service_rating"), // 1-5 rating for service
  dietaryOptions: text("dietary_options").array(), // "vegetarian", "vegan", "gluten-free"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  userId: true,
  restaurantId: true,
  content: true,
  rating: true,
  visibility: true,
  dishesTried: true,
  images: true,
  videos: true,
  imageTags: true,
  priceAssessment: true,
  atmosphere: true,
  serviceRating: true,
  dietaryOptions: true,
});

// Comment model
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  postId: true,
  userId: true,
  content: true,
});

// Circle model (social trust network for recommendations)
export const circles = pgTable("circles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  // Shareable join link features
  inviteCode: text("invite_code").unique(),
  allowPublicJoin: boolean("allow_public_join").default(false),
  // Personalization features
  tags: text("tags").array(),
  primaryCuisine: text("primary_cuisine"),
  priceRange: text("price_range"), // "$", "$$", "$$$", "$$$$"
  location: text("location"), // City/region focus
  memberCount: integer("member_count").default(0),
  featured: boolean("featured").default(false),
  trending: boolean("trending").default(false),
});
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  circleId: integer("circle_id")
    .notNull()
    .references(() => circles.id),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schema for inserts
export const insertRecommendationSchema = createInsertSchema(recommendations).pick({
  circleId: true,
  restaurantId: true,
  userId: true,
});

export const insertCircleSchema = createInsertSchema(circles).pick({
  name: true,
  description: true,
  creatorId: true,
  isPrivate: true,
  allowPublicJoin: true,
  tags: true,
  primaryCuisine: true,
  priceRange: true,
  location: true,
});

// CircleMember model
export const circleMembers = pgTable("circle_members", {
  id: serial("id").primaryKey(),
  circleId: integer("circle_id").references(() => circles.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default("member"), // Can be: "owner", "admin", "member"
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  invitedBy: integer("invited_by").references(() => users.id),
});

export const insertCircleMemberSchema = createInsertSchema(circleMembers).pick({
  circleId: true,
  userId: true,
  role: true,
  invitedBy: true,
});

// Like model
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLikeSchema = createInsertSchema(likes).pick({
  postId: true,
  userId: true,
});

// Saved Restaurant model
export const savedRestaurants = pgTable("saved_restaurants", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  userId: integer("user_id").notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

export const insertSavedRestaurantSchema = createInsertSchema(savedRestaurants).pick({
  restaurantId: true,
  userId: true,
});

// Story model
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  image: text("image").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertStorySchema = createInsertSchema(stories).pick({
  userId: true,
  content: true,
  image: true,
  expiresAt: true,
});

// Restaurant List model
export const restaurantLists = pgTable("restaurant_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  circleId: integer("circle_id").references(() => circles.id), // Optional: if associated with a circle
  isPublic: boolean("is_public").default(true),
  tags: text("tags").array(),
  // Location-based fields
  primaryLocation: text("primary_location"), // City name (e.g., "Toronto")
  locationLat: text("location_lat"), // For geographic search
  locationLng: text("location_lng"), // For geographic search
  // Enhanced sharing
  visibility: text("visibility").default("public").notNull(), // public, circle, private
  allowSharing: boolean("allow_sharing").default(true), // Whether the list can be shared by others
  shareableCircles: integer("shareable_circles").array(), // IDs of circles this list can be shared with
  isFeatured: boolean("is_featured").default(false), // For curated lists
  // User Story 5: List Visibility & Sharing Controls
  shareWithCircle: boolean("share_with_circle").default(false),
  makePublic: boolean("make_public").default(false),
  // Tracking fields
  viewCount: integer("view_count").default(0),
  saveCount: integer("save_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRestaurantListSchema = createInsertSchema(restaurantLists).pick({
  name: true,
  description: true,
  createdById: true,
  circleId: true,
  isPublic: true, // For backward compatibility
  visibility: true,
  allowSharing: true,
  shareableCircles: true,
  tags: true,
  primaryLocation: true,
  locationLat: true,
  locationLng: true,
  shareWithCircle: true,
  makePublic: true,
});

// Restaurant List Items model (restaurants in a list)
export const restaurantListItems = pgTable("restaurant_list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  rating: integer("rating"), // 1-5 star rating
  priceAssessment: text("price_assessment"), // Great value, Fair, Overpriced
  liked: text("liked"), // What I liked
  disliked: text("disliked"), // What I didn't like
  notes: text("notes"),
  mustTryDishes: text("must_try_dishes").array(),
  addedById: integer("added_by_id").notNull(),
  position: integer("position").default(0),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertRestaurantListItemSchema = createInsertSchema(restaurantListItems).pick({
  listId: true,
  restaurantId: true,
  rating: true,
  priceAssessment: true,
  liked: true,
  disliked: true,
  notes: true,
  mustTryDishes: true,
  addedById: true,
  position: true,
});

// List Item Comments model (comments on specific list items)
export const listItemComments = pgTable("list_item_comments", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => restaurantListItems.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListItemCommentSchema = createInsertSchema(listItemComments).pick({
  itemId: true,
  userId: true,
  content: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Circle = typeof circles.$inferSelect;
export type InsertCircle = z.infer<typeof insertCircleSchema>;

export type CircleMember = typeof circleMembers.$inferSelect;
export type InsertCircleMember = z.infer<typeof insertCircleMemberSchema>;

// For backward compatibility with existing code
export type Hub = Circle;
export type InsertHub = InsertCircle;
export type HubMember = CircleMember;
export type InsertHubMember = InsertCircleMember;

// Alias the tables for backward compatibility
export const hubs = circles;
export const hubMembers = circleMembers;

export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;

export type SavedRestaurant = typeof savedRestaurants.$inferSelect;
export type InsertSavedRestaurant = z.infer<typeof insertSavedRestaurantSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;

export type RestaurantList = typeof restaurantLists.$inferSelect;
export type InsertRestaurantList = z.infer<typeof insertRestaurantListSchema>;

export type RestaurantListItem = typeof restaurantListItems.$inferSelect;
export type InsertRestaurantListItem = z.infer<typeof insertRestaurantListItemSchema>;

export type ListItemComment = typeof listItemComments.$inferSelect;
export type InsertListItemComment = z.infer<typeof insertListItemCommentSchema>;

// Shared Lists model (for tracking when lists are shared with circles)
export const sharedLists = pgTable("shared_lists", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").references(() => restaurantLists.id).notNull(),
  circleId: integer("circle_id").references(() => circles.id).notNull(),
  sharedById: integer("shared_by_id").references(() => users.id).notNull(),
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
  // Additional permissions
  canEdit: boolean("can_edit").default(false),
  canReshare: boolean("can_reshare").default(false),
});

export const insertSharedListSchema = createInsertSchema(sharedLists).pick({
  listId: true,
  circleId: true,
  sharedById: true,
  canEdit: true,
  canReshare: true,
});

export type SharedList = typeof sharedLists.$inferSelect;
export type InsertSharedList = z.infer<typeof insertSharedListSchema>;

// User Followers model
export const userFollowers = pgTable("user_followers", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id).notNull(),
  followingId: integer("following_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserFollowerSchema = createInsertSchema(userFollowers).pick({
  followerId: true,
  followingId: true,
});

export type UserFollower = typeof userFollowers.$inferSelect;
export type InsertUserFollower = z.infer<typeof insertUserFollowerSchema>;

// Content Reports model for User Story 5: User-Generated Content Moderation
export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => users.id).notNull(),
  contentType: text("content_type").notNull(), // 'post', 'comment', 'list', 'user'
  contentId: integer("content_id").notNull(),
  reason: text("reason").notNull(), // 'spam', 'inappropriate', 'harassment', 'false_info', 'other'
  description: text("description"), // Optional additional details
  status: text("status").default("pending").notNull(), // 'pending', 'reviewing', 'resolved', 'dismissed'
  reviewedById: integer("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"), // Action taken: 'no_action', 'content_removed', 'user_warned', 'user_suspended'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentReportSchema = createInsertSchema(contentReports).pick({
  reporterId: true,
  contentType: true,
  contentId: true,
  reason: true,
  description: true,
});

export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;

// Post List Items model (for tagging posts into lists)
export const postListItems = pgTable("post_list_items", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  listId: integer("list_id").references(() => restaurantLists.id).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertPostListItemSchema = createInsertSchema(postListItems).pick({
  postId: true,
  listId: true,
});

export type PostListItem = typeof postListItems.$inferSelect;
export type InsertPostListItem = z.infer<typeof insertPostListItemSchema>;

// Search Analytics model for tracking user search behavior
export const searchAnalytics = pgTable("search_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // null for anonymous users
  query: text("query").notNull(),
  category: text("category").default("all").notNull(), // 'restaurant', 'list', 'post', 'user', 'all'
  resultCount: integer("result_count").default(0).notNull(),
  clicked: boolean("clicked").default(false).notNull(),
  clickedResultId: text("clicked_result_id"),
  clickedResultType: text("clicked_result_type"), // 'restaurant', 'list', 'post', 'user'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics).pick({
  userId: true,
  query: true,
  category: true,
  resultCount: true,
  clicked: true,
  clickedResultId: true,
  clickedResultType: true,
});

export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;

// User Search Preferences model for personalized search
export const userSearchPreferences = pgTable("user_search_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  recentSearches: text("recent_searches").array(), // Last 20 searches
  favoriteCategories: text("favorite_categories").array(), // Preferred search categories
  searchFilters: json("search_filters"), // User's preferred default filters
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSearchPreferencesSchema = createInsertSchema(userSearchPreferences).pick({
  userId: true,
  recentSearches: true,
  favoriteCategories: true,
  searchFilters: true,
});

export type UserSearchPreferences = typeof userSearchPreferences.$inferSelect;
export type InsertUserSearchPreferences = z.infer<typeof insertUserSearchPreferencesSchema>;

// Content Moderation Status - add moderation fields to existing content
// Note: These will be added as optional fields to existing tables via migrations