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
  location: text("location").notNull(),
  category: text("category").notNull(),
  priceRange: text("price_range").notNull(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).pick({
  name: true,
  location: true,
  category: true,
  priceRange: true,
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
  images: text("images").array(), // Made optional effectively
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

// Hub/Community model
export const hubs = pgTable("hubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  image: text("image"),
  isPrivate: boolean("is_private").default(false),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHubSchema = createInsertSchema(hubs).pick({
  name: true,
  description: true,
  category: true,
  image: true,
  isPrivate: true,
  tags: true,
});

// HubMember model
export const hubMembers = pgTable("hub_members", {
  id: serial("id").primaryKey(),
  hubId: integer("hub_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").default("member"), // Can be: "owner", "admin", "member"
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertHubMemberSchema = createInsertSchema(hubMembers).pick({
  hubId: true,
  userId: true,
  role: true,
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
  createdById: integer("created_by_id").notNull(),
  hubId: integer("hub_id"), // Optional: if associated with a hub
  isPublic: boolean("is_public").default(true),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRestaurantListSchema = createInsertSchema(restaurantLists).pick({
  name: true,
  description: true,
  createdById: true,
  hubId: true,
  isPublic: true,
  tags: true,
});

// Restaurant List Items model (restaurants in a list)
export const restaurantListItems = pgTable("restaurant_list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  notes: text("notes"),
  mustTryDishes: text("must_try_dishes").array(),
  addedById: integer("added_by_id").notNull(),
  position: integer("position").default(0),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertRestaurantListItemSchema = createInsertSchema(restaurantListItems).pick({
  listId: true,
  restaurantId: true,
  notes: true,
  mustTryDishes: true,
  addedById: true,
  position: true,
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

export type Hub = typeof hubs.$inferSelect;
export type InsertHub = z.infer<typeof insertHubSchema>;

export type HubMember = typeof hubMembers.$inferSelect;
export type InsertHubMember = z.infer<typeof insertHubMemberSchema>;

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
