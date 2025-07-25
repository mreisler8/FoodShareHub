import { 
  users, type User, type InsertUser,
  restaurants, type Restaurant, type InsertRestaurant,
  posts, type Post, type InsertPost,
  comments, type Comment, type InsertComment,
  circles, type Circle, type InsertCircle,
  circleMembers, type CircleMember, type InsertCircleMember,
  likes, type Like, type InsertLike,
  savedRestaurants, type SavedRestaurant, type InsertSavedRestaurant,
  stories, type Story, type InsertStory,
  restaurantLists, type RestaurantList, type InsertRestaurantList,
  restaurantListItems, type RestaurantListItem, type InsertRestaurantListItem,
  sharedLists, type SharedList, type InsertSharedList,
  userFollowers, type UserFollower, type InsertUserFollower,
  contentReports, type ContentReport, type InsertContentReport,
  postListItems, type PostListItem, type InsertPostListItem,
  searchAnalytics, type SearchAnalytics, type InsertSearchAnalytics,
  userSearchPreferences, type UserSearchPreferences, type InsertUserSearchPreferences
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, gt, or, not, inArray } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

// For backward compatibility
import { Hub, InsertHub, HubMember, InsertHubMember } from "@shared/schema";

// Use PostgreSQL for session storage
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // User Following operations
  followUser(followerId: number, followingId: number): Promise<UserFollower>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  isUserFollowing(followerId: number, followingId: number): Promise<boolean>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  
  // Restaurant operations
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  getAllRestaurants(): Promise<Restaurant[]>;
  searchRestaurants(query: string): Promise<Restaurant[]>;
  searchRestaurantsByLocation(location: string): Promise<Restaurant[]>;
  getRestaurantsByLocation(location: string): Promise<Restaurant[]>;
  getNearbyRestaurants(lat: string, lng: string, radius: number): Promise<Restaurant[]>;
  
  // Post operations
  getPost(id: number): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  createPostWithLists(post: InsertPost, listIds?: number[]): Promise<Post>;
  updatePost(id: number, post: Partial<InsertPost>): Promise<Post>;
  deletePost(id: number): Promise<void>;
  getAllPosts(): Promise<Post[]>;
  getPostsByUser(userId: number): Promise<Post[]>;
  getPostsByRestaurant(restaurantId: number): Promise<Post[]>;
  getPostDetails(postId: number): Promise<any>;
  getFeedPosts(options?: { offset?: number; limit?: number; userId?: number; scope?: 'feed' | 'circle'; circleId?: number }): Promise<any[]>;
  
  // Comment operations
  getComment(id: number): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
  getCommentsByPost(postId: number): Promise<Comment[]>;
  
  // Post List Item operations
  createPostListItem(postListItem: InsertPostListItem): Promise<PostListItem>;
  deletePostListItem(postId: number, listId: number): Promise<void>;
  getPostListItems(postId: number): Promise<PostListItem[]>;
  getListsByPost(postId: number): Promise<RestaurantList[]>;
  
  // Circle operations
  getCircle(id: number): Promise<Hub | undefined>;
  createCircle(circle: InsertHub): Promise<Hub>;
  getAllCircles(): Promise<Hub[]>;
  getFeaturedCircles(): Promise<Hub[]>;
  
  // Circle Member operations
  createCircleMember(circleMember: InsertHubMember): Promise<HubMember>;
  getCircleMembers(circleId: number): Promise<HubMember[]>;
  getCirclesByUser(userId: number): Promise<Hub[]>;
  isUserMemberOfCircle(userId: number, circleId: number): Promise<boolean>;
  
  // Legacy Hub operations (for backward compatibility)
  getHub(id: number): Promise<Hub | undefined>;
  createHub(hub: InsertHub): Promise<Hub>;
  getAllHubs(): Promise<Hub[]>;
  getFeaturedHubs(): Promise<Hub[]>;
  
  // Legacy Hub Member operations (for backward compatibility)
  createHubMember(hubMember: InsertHubMember): Promise<HubMember>;
  getHubMembers(hubId: number): Promise<HubMember[]>;
  getHubsByUser(userId: number): Promise<Hub[]>;
  isUserMemberOfHub(userId: number, hubId: number): Promise<boolean>;
  
  // Like operations
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(postId: number, userId: number): Promise<void>;
  getLikesByPost(postId: number): Promise<Like[]>;
  isPostLikedByUser(postId: number, userId: number): Promise<boolean>;
  
  // Saved Restaurant operations
  createSavedRestaurant(savedRestaurant: InsertSavedRestaurant): Promise<SavedRestaurant>;
  getSavedRestaurantsByUser(userId: number): Promise<SavedRestaurant[]>;
  
  // Story operations
  createStory(story: InsertStory): Promise<Story>;
  getActiveStories(): Promise<Story[]>;
  getStoriesByUser(userId: number): Promise<Story[]>;
  
  // Restaurant List operations
  createRestaurantList(list: InsertRestaurantList): Promise<RestaurantList>;
  getRestaurantList(id: number): Promise<RestaurantList | undefined>;
  updateRestaurantList(id: number, updates: Partial<RestaurantList>): Promise<RestaurantList>;
  deleteRestaurantList(id: number): Promise<void>;
  getRestaurantListsByHub(hubId: number): Promise<RestaurantList[]>;
  getRestaurantListsByCircle(circleId: number): Promise<RestaurantList[]>;
  getRestaurantListsByUser(userId: number): Promise<RestaurantList[]>;
  getPublicRestaurantLists(): Promise<RestaurantList[]>;
  
  // Restaurant List Item operations
  addRestaurantToList(item: InsertRestaurantListItem): Promise<RestaurantListItem>;
  removeRestaurantFromList(listId: number, restaurantId: number): Promise<void>;
  removeRestaurantListItem(itemId: number): Promise<void>;
  updateRestaurantListItem(itemId: number, updates: Partial<RestaurantListItem>): Promise<RestaurantListItem>;
  getRestaurantsInList(listId: number): Promise<RestaurantListItem[]>;
  getDetailedRestaurantsInList(listId: number): Promise<any[]>; // with restaurant details
  
  // Shared List operations
  shareListWithCircle(listId: number, circleId: number, sharedById: number, permissions?: { canEdit?: boolean; canReshare?: boolean }): Promise<SharedList>;
  unshareListFromCircle(listId: number, circleId: number): Promise<void>;
  getListsSharedWithCircle(circleId: number): Promise<any[]>; // Lists with details
  getCirclesListIsSharedWith(listId: number): Promise<any[]>; // Circles with permissions
  
  // Session store for authentication
  sessionStore: any; // Using any for session store
  
  // Analytics operations
  logUserAction(userId: number, action: string, metadata: Record<string, any>): Promise<void>;
  getActionsByUser(userId: number): Promise<any[]>;
  getPopularContent(): Promise<any[]>;
  
  // Content Moderation operations
  createContentReport(report: InsertContentReport): Promise<ContentReport>;
  getContentReports(options?: { status?: string; contentType?: string; limit?: number }): Promise<ContentReport[]>;
  updateContentReportStatus(reportId: number, status: string, reviewedById: number, resolution?: string): Promise<ContentReport>;
  getReportsByContent(contentType: string, contentId: number): Promise<ContentReport[]>;
  // New methods for personalized suggestions and invite codes
  getCircleByInviteCode(inviteCode: string): Promise<Circle | undefined>;
  getPersonalizedCircleSuggestions(userId: number): Promise<Circle[]>;
  joinCircleByInviteCode(inviteCode: string, userId: number): Promise<{ success: boolean; circle?: Circle; error?: string }>;
  
  // Search Analytics operations
  trackSearchAnalytics(data: InsertSearchAnalytics & { timestamp: Date }): Promise<SearchAnalytics>;
  getTrendingSearches(limit: number, timeframe: string): Promise<any[]>;
  getPopularSearchesByCategory(category: string, limit: number): Promise<any[]>;
  getSearchSuggestions(query: string, limit: number): Promise<string[]>;
  getUserRecentSearches(userId: number, limit: number): Promise<string[]>;
  updateUserRecentSearches(userId: number, query: string): Promise<void>;
}

// Implementation using PostgreSQL Database via Drizzle ORM
export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any for session store type
  
  constructor() {
    try {
      this.sessionStore = new PostgresSessionStore({ 
        pool, 
        createTableIfMissing: true,
        tableName: 'session'
      });
      // Initialize analytics table asynchronously to not block startup
      this.initializeAnalyticsTable().catch(err => {
        console.error('Failed to initialize analytics table:', err);
      });
    } catch (error) {
      console.error('Failed to initialize session store:', error);
      throw error;
    }
  }
  
  private async initializeAnalyticsTable() {
    try {
      // We'll use this for analytics tracking
      await db.execute(`
        CREATE TABLE IF NOT EXISTS analytics (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          action TEXT NOT NULL,
          metadata JSONB NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Analytics table initialized successfully');
    } catch (error) {
      console.error('Failed to create analytics table:', error);
      // Don't throw here to prevent app startup failure
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
  
  // Restaurant operations
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const [restaurant] = await db.insert(restaurants).values(insertRestaurant).returning();
    return restaurant;
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants);
  }

  async searchRestaurants(query: string): Promise<Restaurant[]> {
    try {
      // Enhanced search to look in multiple fields
      const results = await db.select().from(restaurants).where(
        or(
          like(restaurants.name, `%${query}%`),
          like(restaurants.location, `%${query}%`),
          like(restaurants.category, `%${query}%`),
          like(restaurants.cuisine, `%${query}%`)
        )
      );
      
      console.log(`Search results for "${query}":`, results);
      return results;
    } catch (error) {
      console.error(`Error searching restaurants for "${query}":`, error);
      return [];
    }
  }
  
  async searchRestaurantsByLocation(location: string): Promise<Restaurant[]> {
    try {
      const results = await db.select().from(restaurants).where(
        like(restaurants.location, `%${location}%`)
      );
      console.log(`Location search results for "${location}":`, results);
      return results;
    } catch (error) {
      console.error(`Error searching restaurants by location "${location}":`, error);
      return [];
    }
  }
  
  async getRestaurantsByLocation(location: string): Promise<Restaurant[]> {
    return this.searchRestaurantsByLocation(location);
  }
  
  async getNearbyRestaurants(lat: string, lng: string, radius: number): Promise<Restaurant[]> {
    try {
      // For now, this is a simple implementation since we don't have GPS coordinates in our data
      // In a real app, this would calculate distance between coordinates
      // For now, we'll just return restaurants in NYC as a fallback
      const results = await db.select().from(restaurants).where(
        like(restaurants.location, '%NYC%')
      ).limit(10);
      
      console.log(`Getting nearby restaurants for coordinates (${lat}, ${lng}):`, results);
      return results;
    } catch (error) {
      console.error(`Error getting nearby restaurants:`, error);
      return [];
    }
  }
  
  // Post operations
  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values({
      ...insertPost,
      createdAt: new Date()
    }).returning();
    return post;
  }

  async createPostWithLists(insertPost: InsertPost, listIds?: number[]): Promise<Post> {
    const [post] = await db.insert(posts).values({
      ...insertPost,
      createdAt: new Date()
    }).returning();
    
    // If listIds are provided, create post list items
    if (listIds && listIds.length > 0) {
      const postListItems = listIds.map(listId => ({
        postId: post.id,
        listId: listId
      }));
      
      await Promise.all(
        postListItems.map(item => this.createPostListItem(item))
      );
    }
    
    return post;
  }
  
  async updatePost(id: number, postUpdates: Partial<InsertPost>): Promise<Post> {
    const [updatedPost] = await db
      .update(posts)
      .set(postUpdates)
      .where(eq(posts.id, id))
      .returning();
    
    if (!updatedPost) {
      throw new Error("Post not found");
    }
    
    return updatedPost;
  }
  
  async deletePost(id: number): Promise<void> {
    // First, delete all likes related to this post
    await db.delete(likes).where(eq(likes.postId, id));
    
    // Then, delete all comments related to this post
    await db.delete(comments).where(eq(comments.postId, id));
    
    // Finally, delete the post itself
    await db.delete(posts).where(eq(posts.id, id));
  }

  async getAllPosts(): Promise<Post[]> {
    return await db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async getPostsByUser(userId: number): Promise<Post[]> {
    return await db.select().from(posts).where(eq(posts.userId, userId));
  }

  async getPostsByRestaurant(restaurantId: number): Promise<Post[]> {
    return await db.select().from(posts).where(eq(posts.restaurantId, restaurantId));
  }

  async getPostDetails(postId: number): Promise<any> {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) return undefined;
    
    const [author] = await db.select().from(users).where(eq(users.id, post.userId));
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, post.restaurantId));
    const commentList = await this.getCommentsByPost(postId);
    
    const commentWithAuthors = await Promise.all(
      commentList.map(async (comment) => {
        const [commentAuthor] = await db.select().from(users).where(eq(users.id, comment.userId));
        return {
          ...comment,
          author: commentAuthor
        };
      })
    );
    
    const likeCount = await this.getLikesByPost(postId).then(likes => likes.length);
    
    return {
      ...post,
      author,
      restaurant,
      comments: commentWithAuthors,
      likeCount
    };
  }

  // Optimized getFeedPosts method with pagination support
  async getFeedPosts(options?: { offset?: number; limit?: number; userId?: number; scope?: 'feed' | 'circle'; circleId?: number }): Promise<any[]> {
    let allPosts;
    
    if (options?.scope === 'circle' && options?.circleId) {
      // Get posts shared to the specific circle
      // For now, get all posts and filter by visibility (simplified)
      allPosts = await db.select().from(posts)
        .orderBy(desc(posts.createdAt))
        .where(eq(posts.visibility, 'public')); // Simplified: assuming circle posts are public
    } else {
      // Default feed - get posts by followed users where visibility includes feed
      // For now, get all public posts (would need user following implementation for full functionality)
      allPosts = await db.select().from(posts)
        .orderBy(desc(posts.createdAt))
        .where(eq(posts.visibility, 'public'));
    }
    
    // Apply offset and limit if options are provided
    const offset = options?.offset || 0;
    const limit = options?.limit || allPosts.length;
    const userId = options?.userId;
    
    // Get paginated posts
    const paginatedPosts = allPosts.slice(offset, offset + limit);
    
    // Process posts with details efficiently
    const postsWithDetails = await Promise.all(
      paginatedPosts.map(async (post) => {
        // Fetch related data
        const [author] = await db.select().from(users).where(eq(users.id, post.userId));
        const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, post.restaurantId));
        const likeCount = await this.getLikesByPost(post.id).then(likes => likes.length);
        
        // Get comment count for display
        const comments = await this.getCommentsByPost(post.id);
        
        // Create the post with details
        const postWithDetails: any = {
          ...post,
          author,
          restaurant,
          likeCount,
          commentCount: comments.length,
          totalPosts: allPosts.length,
          comments: [] // Empty array to be populated if needed
        };
        
        return postWithDetails;
      })
    );
    
    // Add pagination metadata directly as an object
    // rather than trying to modify the posts
    const paginationMeta = {
      total: allPosts.length,
      offset,
      limit,
      hasMore: offset + limit < allPosts.length
    };
    
    // Create a paginated result
    const result: any[] = [...postsWithDetails];
    
    // Add pagination info as a special field on the array
    Object.defineProperty(result, 'pagination', {
      value: paginationMeta,
      enumerable: false // Makes it not show up in JSON.stringify
    });
    
    // Return the result with the pagination property
    return result;
  }
  
  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values({
      ...insertComment,
      createdAt: new Date()
    }).returning();
    return comment;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  async getCommentsByPost(postId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.postId, postId));
  }
  
  // Post List Item operations
  async createPostListItem(insertPostListItem: InsertPostListItem): Promise<PostListItem> {
    const [item] = await db.insert(postListItems).values({
      ...insertPostListItem,
      addedAt: new Date()
    }).returning();
    return item;
  }

  async deletePostListItem(postId: number, listId: number): Promise<void> {
    await db.delete(postListItems).where(and(
      eq(postListItems.postId, postId),
      eq(postListItems.listId, listId)
    ));
  }

  async getPostListItems(postId: number): Promise<PostListItem[]> {
    return await db.select().from(postListItems).where(eq(postListItems.postId, postId));
  }

  async getListsByPost(postId: number): Promise<RestaurantList[]> {
    const result = await db.select({
      list: restaurantLists
    })
    .from(postListItems)
    .innerJoin(restaurantLists, eq(postListItems.listId, restaurantLists.id))
    .where(eq(postListItems.postId, postId));
    
    return result.map(item => item.list);
  }
  
  // Circle operations
  async getCircle(id: number): Promise<Circle | undefined> {
    const [circle] = await db.select().from(circles).where(eq(circles.id, id));
    return circle;
  }

  async createCircle(insertCircle: InsertCircle): Promise<Circle> {
    // Generate unique invite code
    const inviteCode = this.generateInviteCode();
    
    const [circle] = await db.insert(circles).values({
      ...insertCircle,
      inviteCode,
      memberCount: 1, // Creator is the first member
      createdAt: new Date()
    }).returning();
    return circle;
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getCircleByInviteCode(inviteCode: string): Promise<Circle | undefined> {
    const [circle] = await db.select().from(circles).where(eq(circles.inviteCode, inviteCode));
    return circle;
  }

  async getPersonalizedCircleSuggestions(userId: number): Promise<Circle[]> {
    // Get user's dining preferences
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return [];

    // Get circles user isn't already a member of
    const userCircleIds = await db.select({ circleId: circleMembers.circleId })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));
    
    const excludeIds = userCircleIds.map(m => m.circleId);

    // Base query for available circles
    let query = db.select().from(circles)
      .where(and(
        eq(circles.allowPublicJoin, true),
        ...(excludeIds.length > 0 ? [not(inArray(circles.id, excludeIds))] : [])
      ))
      .limit(10);

    const allCircles = await query;

    // Score circles based on user preferences
    const scoredCircles = allCircles.map(circle => {
      let score = 0;
      
      // Match by cuisine preference
      if (user.preferredCuisines && circle.primaryCuisine) {
        if (user.preferredCuisines.includes(circle.primaryCuisine)) {
          score += 10;
        }
      }
      
      // Match by price range
      if (user.preferredPriceRange && circle.priceRange) {
        if (user.preferredPriceRange === circle.priceRange) {
          score += 8;
        }
      }
      
      // Match by location
      if (user.preferredLocation && circle.location) {
        if (user.preferredLocation.toLowerCase().includes(circle.location.toLowerCase()) ||
            circle.location.toLowerCase().includes(user.preferredLocation.toLowerCase())) {
          score += 6;
        }
      }
      
      // Boost featured and trending circles
      if (circle.featured) score += 5;
      if (circle.trending) score += 3;
      
      // Boost circles with more members (popularity)
      if (circle.memberCount) {
        score += Math.min(circle.memberCount / 10, 5);
      }
      
      return { ...circle, score };
    });

    // Sort by score and return top matches
    return scoredCircles
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  async joinCircleByInviteCode(inviteCode: string, userId: number): Promise<{ success: boolean; circle?: Circle; error?: string }> {
    const circle = await this.getCircleByInviteCode(inviteCode);
    
    if (!circle) {
      return { success: false, error: "Invalid invite code" };
    }

    if (!circle.allowPublicJoin) {
      return { success: false, error: "This circle doesn't allow public joining" };
    }

    // Check if user is already a member
    const isAlreadyMember = await this.isUserMemberOfCircle(userId, circle.id);
    if (isAlreadyMember) {
      return { success: false, error: "You're already a member of this circle" };
    }

    // Add user to circle
    await this.createCircleMember({
      circleId: circle.id,
      userId,
      role: "member"
    });

    // Update member count
    await db.update(circles)
      .set({ memberCount: (circle.memberCount || 0) + 1 })
      .where(eq(circles.id, circle.id));

    return { success: true, circle };
  }

  async getAllCircles(): Promise<Circle[]> {
    return await db.select().from(circles);
  }

  async getFeaturedCircles(): Promise<Circle[]> {
    // In a real app, you'd have criteria for featuring circles
    return await db.select().from(circles).limit(5);
  }
  
  // Circle Member operations
  async createCircleMember(insertCircleMember: InsertCircleMember): Promise<CircleMember> {
    const [member] = await db.insert(circleMembers).values({
      ...insertCircleMember,
      joinedAt: new Date()
    }).returning();
    return member;
  }

  async getCircleMembers(circleId: number): Promise<CircleMember[]> {
    return await db.select().from(circleMembers).where(eq(circleMembers.circleId, circleId));
  }

  async getCirclesByUser(userId: number): Promise<Circle[]> {
    const memberships = await db.select().from(circleMembers).where(eq(circleMembers.userId, userId));
    
    const circleIds = memberships.map(m => m.circleId);
    
    if (circleIds.length === 0) return [];
    
    const userCircles = await Promise.all(
      circleIds.map(async (id) => {
        const [circle] = await db.select().from(circles).where(eq(circles.id, id));
        return circle;
      })
    );
    
    return userCircles.filter(Boolean) as Circle[];
  }

  async isUserMemberOfCircle(userId: number, circleId: number): Promise<boolean> {
    const [membership] = await db.select().from(circleMembers).where(
      and(
        eq(circleMembers.userId, userId),
        eq(circleMembers.circleId, circleId)
      )
    );
    return !!membership;
  }
  
  // Legacy Hub operations (for backward compatibility)
  async getHub(id: number): Promise<Hub | undefined> {
    return this.getCircle(id);
  }

  async createHub(hub: InsertHub): Promise<Hub> {
    return this.createCircle(hub);
  }

  async getAllHubs(): Promise<Hub[]> {
    return this.getAllCircles();
  }

  async getFeaturedHubs(): Promise<Hub[]> {
    return this.getFeaturedCircles();
  }
  
  // Legacy Hub Member operations (for backward compatibility)
  async createHubMember(hubMember: InsertHubMember): Promise<HubMember> {
    return this.createCircleMember(hubMember);
  }

  async getHubMembers(hubId: number): Promise<HubMember[]> {
    return this.getCircleMembers(hubId);
  }

  async getHubsByUser(userId: number): Promise<Hub[]> {
    return this.getCirclesByUser(userId);
  }

  async isUserMemberOfHub(userId: number, hubId: number): Promise<boolean> {
    return this.isUserMemberOfCircle(userId, hubId);
  }
  
  // Like operations
  async createLike(insertLike: InsertLike): Promise<Like> {
    const [like] = await db.insert(likes).values({
      ...insertLike,
      createdAt: new Date()
    }).returning();
    return like;
  }

  async deleteLike(postId: number, userId: number): Promise<void> {
    await db.delete(likes).where(
      and(
        eq(likes.postId, postId),
        eq(likes.userId, userId)
      )
    );
  }

  async getLikesByPost(postId: number): Promise<Like[]> {
    return await db.select().from(likes).where(eq(likes.postId, postId));
  }

  async isPostLikedByUser(postId: number, userId: number): Promise<boolean> {
    const [like] = await db.select().from(likes).where(
      and(
        eq(likes.postId, postId),
        eq(likes.userId, userId)
      )
    );
    return !!like;
  }
  
  // Saved Restaurant operations
  async createSavedRestaurant(insertSavedRestaurant: InsertSavedRestaurant): Promise<SavedRestaurant> {
    const [savedRestaurant] = await db.insert(savedRestaurants).values({
      ...insertSavedRestaurant,
      savedAt: new Date()
    }).returning();
    return savedRestaurant;
  }

  async getSavedRestaurantsByUser(userId: number): Promise<SavedRestaurant[]> {
    return await db.select().from(savedRestaurants).where(eq(savedRestaurants.userId, userId));
  }
  
  // Story operations
  async createStory(insertStory: InsertStory): Promise<Story> {
    const [story] = await db.insert(stories).values({
      ...insertStory,
      createdAt: new Date()
    }).returning();
    return story;
  }

  async getActiveStories(): Promise<Story[]> {
    // Stories are active for 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Using gt() function instead of sql template literal
    return await db.select().from(stories).where(gt(stories.createdAt, oneDayAgo));
  }

  async getStoriesByUser(userId: number): Promise<Story[]> {
    return await db.select().from(stories).where(eq(stories.userId, userId));
  }
  
  // Restaurant List operations
  async createRestaurantList(insertList: InsertRestaurantList): Promise<RestaurantList> {
    const now = new Date();
    const [list] = await db.insert(restaurantLists).values({
      ...insertList,
      createdAt: now,
      updatedAt: now
    }).returning();
    return list;
  }

  async getRestaurantList(id: number): Promise<RestaurantList | undefined> {
    const [list] = await db.select().from(restaurantLists).where(eq(restaurantLists.id, id));
    return list;
  }

  async getRestaurantListsByHub(hubId: number): Promise<RestaurantList[]> {
    return await db.select().from(restaurantLists).where(eq(restaurantLists.circleId, hubId));
  }

  async getRestaurantListsByCircle(circleId: number): Promise<RestaurantList[]> {
    return await db.select().from(restaurantLists).where(eq(restaurantLists.circleId, circleId));
  }

  async getRestaurantListsByUser(userId: number): Promise<RestaurantList[]> {
    try {
      // Use the correct field name from the schema (createdById, not creatorId)
      const lists = await db.select().from(restaurantLists).where(eq(restaurantLists.createdById, userId));
      return lists;
    } catch (error) {
      console.error("Error getting restaurant lists by user:", error);
      // Return empty array rather than letting the error propagate
      return [];
    }
  }

  async getPublicRestaurantLists(): Promise<RestaurantList[]> {
    return await db.select().from(restaurantLists).where(eq(restaurantLists.visibility, 'public'));
  }
  
  async updateRestaurantList(id: number, updates: Partial<RestaurantList>): Promise<RestaurantList> {
    const now = new Date();
    const updatedData = {
      ...updates,
      updatedAt: now
    };
    
    const [updatedList] = await db
      .update(restaurantLists)
      .set(updatedData)
      .where(eq(restaurantLists.id, id))
      .returning();
    
    return updatedList;
  }
  
  async incrementListViewCount(id: number): Promise<RestaurantList> {
    const [list] = await db.select().from(restaurantLists).where(eq(restaurantLists.id, id));
    const currentViews = list.viewCount || 0;
    
    return this.updateRestaurantList(id, { viewCount: currentViews + 1 });
  }
  
  async incrementListSaveCount(id: number): Promise<RestaurantList> {
    const [list] = await db.select().from(restaurantLists).where(eq(restaurantLists.id, id));
    const currentSaves = list.saveCount || 0;
    
    return this.updateRestaurantList(id, { saveCount: currentSaves + 1 });
  }

  async deleteRestaurantList(id: number): Promise<void> {
    // First delete all items in the list
    await db.delete(restaurantListItems).where(eq(restaurantListItems.listId, id));
    
    // Delete any shared list records
    await db.delete(sharedLists).where(eq(sharedLists.listId, id));
    
    // Finally delete the list itself
    await db.delete(restaurantLists).where(eq(restaurantLists.id, id));
  }

  async removeRestaurantListItem(itemId: number): Promise<void> {
    await db.delete(restaurantListItems).where(eq(restaurantListItems.id, itemId));
  }

  // Restaurant List Item operations
  async addRestaurantToList(item: InsertRestaurantListItem): Promise<RestaurantListItem> {
    const [listItem] = await db.insert(restaurantListItems).values({
      ...item,
      addedAt: new Date()
    }).returning();
    return listItem;
  }

  async removeRestaurantFromList(listId: number, restaurantId: number): Promise<void> {
    await db.delete(restaurantListItems).where(
      and(
        eq(restaurantListItems.listId, listId),
        eq(restaurantListItems.restaurantId, restaurantId)
      )
    );
  }

  async getRestaurantsInList(listId: number): Promise<RestaurantListItem[]> {
    return await db.select().from(restaurantListItems).where(eq(restaurantListItems.listId, listId));
  }

  async getDetailedRestaurantsInList(listId: number): Promise<any[]> {
    const items = await this.getRestaurantsInList(listId);
    
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, item.restaurantId));
        const [addedBy] = await db.select().from(users).where(eq(users.id, item.addedById));
        
        return {
          ...item,
          restaurant,
          addedBy
        };
      })
    );
    
    return itemsWithDetails;
  }

  async updateRestaurantListItem(itemId: number, updates: Partial<RestaurantListItem>): Promise<RestaurantListItem> {
    const [updatedItem] = await db
      .update(restaurantListItems)
      .set(updates)
      .where(eq(restaurantListItems.id, itemId))
      .returning();
    return updatedItem;
  }

  // Analytics operations
  async logUserAction(userId: number, action: string, metadata: Record<string, any>): Promise<void> {
    await db.execute(
      `INSERT INTO analytics (user_id, action, metadata) VALUES (${userId}, '${action}', '${JSON.stringify(metadata).replace(/'/g, "''")}')`
    );
  }

  async getActionsByUser(userId: number): Promise<any[]> {
    const result = await db.execute(
      `SELECT * FROM analytics WHERE user_id = ${userId} ORDER BY timestamp DESC LIMIT 100`
    );
    return result.rows;
  }

  // User Following operations
  async followUser(followerId: number, followingId: number): Promise<UserFollower> {
    // First check if the relationship already exists
    const existing = await this.isUserFollowing(followerId, followingId);
    if (existing) {
      throw new Error("Already following this user");
    }
    
    // Prevent users from following themselves
    if (followerId === followingId) {
      throw new Error("Users cannot follow themselves");
    }
    
    // Create the follow relationship
    const [userFollower] = await db.insert(userFollowers).values({
      followerId,
      followingId,
    }).returning();
    
    return userFollower;
  }
  
  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db.delete(userFollowers).where(
      and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      )
    );
  }
  
  async isUserFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db.select().from(userFollowers).where(
      and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      )
    );
    return !!follow;
  }
  
  async getFollowers(userId: number): Promise<User[]> {
    // Get all users who follow the specified user
    const follows = await db.select().from(userFollowers)
      .where(eq(userFollowers.followingId, userId));
    
    // Get user details for each follower
    const followers = await Promise.all(
      follows.map(async (follow) => {
        const [user] = await db.select().from(users)
          .where(eq(users.id, follow.followerId));
        return user;
      })
    );
    
    return followers.filter(Boolean) as User[];
  }
  
  async getFollowing(userId: number): Promise<User[]> {
    // Get all users who the specified user follows
    const follows = await db.select().from(userFollowers)
      .where(eq(userFollowers.followerId, userId));
    
    // Get user details for each followed user
    const following = await Promise.all(
      follows.map(async (follow) => {
        const [user] = await db.select().from(users)
          .where(eq(users.id, follow.followingId));
        return user;
      })
    );
    
    return following.filter(Boolean) as User[];
  }

  async getPopularContent(): Promise<any[]> {
    try {
      // Get popular restaurants with average ratings and post counts
      const popularRestaurants = await db.execute(`
        SELECT 
          r.id,
          r.name,
          r.location,
          r.category,
          r.image_url as "imageUrl",
          AVG(p.rating::numeric) as "averageRating",
          COUNT(p.id) as "postCount",
          'restaurant' as type
        FROM restaurants r
        LEFT JOIN posts p ON r.id = p.restaurant_id
        GROUP BY r.id, r.name, r.location, r.category, r.image_url
        HAVING COUNT(p.id) > 0
        ORDER BY AVG(p.rating::numeric) DESC, COUNT(p.id) DESC
        LIMIT 10
      `);

      // Get popular posts with like and comment counts
      const popularPosts = await db.execute(`
        SELECT 
          p.id,
          p.content,
          p.rating,
          p.created_at as "createdAt",
          COUNT(DISTINCT l.id) as "likeCount",
          COUNT(DISTINCT c.id) as "commentCount",
          u.id as "authorId",
          u.name as "authorName", 
          u.username as "authorUsername",
          r.id as "restaurantId",
          r.name as "restaurantName",
          r.location as "restaurantLocation",
          'post' as type
        FROM posts p
        LEFT JOIN likes l ON p.id = l.post_id
        LEFT JOIN comments c ON p.id = c.post_id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN restaurants r ON p.restaurant_id = r.id
        WHERE p.visibility = 'public'
        GROUP BY p.id, p.content, p.rating, p.created_at, u.id, u.name, u.username, r.id, r.name, r.location
        ORDER BY (COUNT(DISTINCT l.id) + COUNT(DISTINCT c.id)) DESC, p.rating DESC
        LIMIT 10
      `);

      return [...popularRestaurants.rows, ...popularPosts.rows];
    } catch (error) {
      console.error('Error getting popular content:', error);
      return [];
    }
  }

  // Content Moderation operations implementation
  async createContentReport(insertReport: InsertContentReport): Promise<ContentReport> {
    const [report] = await db.insert(contentReports).values(insertReport).returning();
    return report;
  }

  async getContentReports(options?: { status?: string; contentType?: string; limit?: number }): Promise<ContentReport[]> {
    let query = db.select().from(contentReports);
    
    const conditions = [];
    if (options?.status) {
      conditions.push(eq(contentReports.status, options.status));
    }
    if (options?.contentType) {
      conditions.push(eq(contentReports.contentType, options.contentType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(contentReports.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return await query;
  }

  async updateContentReportStatus(reportId: number, status: string, reviewedById: number, resolution?: string): Promise<ContentReport> {
    const updateData: any = {
      status,
      reviewedById,
      reviewedAt: new Date(),
    };
    
    if (resolution) {
      updateData.resolution = resolution;
    }
    
    const [updatedReport] = await db
      .update(contentReports)
      .set(updateData)
      .where(eq(contentReports.id, reportId))
      .returning();
    
    return updatedReport;
  }

  async getReportsByContent(contentType: string, contentId: number): Promise<ContentReport[]> {
    return await db
      .select()
      .from(contentReports)
      .where(and(
        eq(contentReports.contentType, contentType),
        eq(contentReports.contentId, contentId)
      ))
      .orderBy(desc(contentReports.createdAt));
  }

  // Shared List operations implementation
  async shareListWithCircle(listId: number, circleId: number, sharedById: number, permissions: { canEdit?: boolean; canReshare?: boolean } = {}): Promise<SharedList> {
    const [sharedList] = await db.insert(sharedLists).values({
      listId,
      circleId,
      sharedById,
      canEdit: permissions.canEdit || false,
      canReshare: permissions.canReshare || false,
      sharedAt: new Date()
    }).returning();
    return sharedList;
  }

  async unshareListFromCircle(listId: number, circleId: number): Promise<void> {
    await db.delete(sharedLists)
      .where(and(eq(sharedLists.listId, listId), eq(sharedLists.circleId, circleId)));
  }

  async getListsSharedWithCircle(circleId: number): Promise<any[]> {
    const sharedListsData = await db.select({
      sharedList: sharedLists,
      list: restaurantLists,
      sharedBy: {
        id: users.id,
        name: users.name,
        username: users.username
      }
    })
    .from(sharedLists)
    .innerJoin(restaurantLists, eq(sharedLists.listId, restaurantLists.id))
    .innerJoin(users, eq(sharedLists.sharedById, users.id))
    .where(eq(sharedLists.circleId, circleId));

    return sharedListsData;
  }

  async getCirclesListIsSharedWith(listId: number): Promise<any[]> {
    const sharedWithData = await db.select({
      sharedList: sharedLists,
      circle: circles
    })
    .from(sharedLists)
    .innerJoin(circles, eq(sharedLists.circleId, circles.id))
    .where(eq(sharedLists.listId, listId));

    return sharedWithData;
  }

  // Search Analytics implementation
  async trackSearchAnalytics(data: InsertSearchAnalytics & { timestamp: Date }): Promise<SearchAnalytics> {
    try {
      const [analytics] = await db.insert(searchAnalytics).values({
        userId: data.userId,
        query: data.query,
        category: data.category || 'all',
        resultCount: data.resultCount || 0,
        clicked: data.clicked || false,
        clickedResultId: data.clickedResultId,
        clickedResultType: data.clickedResultType,
        timestamp: data.timestamp
      }).returning();
      
      return analytics;
    } catch (error) {
      console.error('Error tracking search analytics:', error);
      throw error;
    }
  }

  async getTrendingSearches(limit: number = 10, timeframe: string = '7d'): Promise<any[]> {
    try {
      const days = timeframe === '30d' ? 30 : timeframe === 'all' ? 365 : 7;
      
      const trending = await db.execute(`
        SELECT 
          query,
          COUNT(*) as search_count,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(result_count::numeric) as avg_results
        FROM search_analytics 
        WHERE timestamp >= NOW() - INTERVAL '${days} days'
        AND LENGTH(query) >= 2
        GROUP BY query
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC
        LIMIT $1
      `, [limit]);
      
      return trending.rows;
    } catch (error) {
      console.error('Error getting trending searches:', error);
      return [];
    }
  }

  async getPopularSearchesByCategory(category: string, limit: number = 5): Promise<any[]> {
    try {
      const popular = await db.execute(`
        SELECT 
          query,
          COUNT(*) as search_count
        FROM search_analytics 
        WHERE category = $1 
        AND timestamp >= NOW() - INTERVAL '30 days'
        AND LENGTH(query) >= 2
        GROUP BY query
        ORDER BY COUNT(*) DESC
        LIMIT $2
      `, [category, limit]);
      
      return popular.rows;
    } catch (error) {
      console.error('Error getting popular searches by category:', error);
      return [];
    }
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      const suggestions = await db.execute(`
        SELECT DISTINCT query
        FROM search_analytics 
        WHERE query ILIKE $1
        AND LENGTH(query) >= 2
        AND result_count > 0
        GROUP BY query
        ORDER BY COUNT(*) DESC
        LIMIT $2
      `, [`${query}%`, limit]);
      
      return suggestions.rows.map((row: any) => row.query);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  async getUserRecentSearches(userId: number, limit: number = 10): Promise<string[]> {
    try {
      const recent = await db.execute(`
        SELECT DISTINCT query
        FROM search_analytics 
        WHERE user_id = $1
        AND LENGTH(query) >= 2
        ORDER BY MAX(timestamp) DESC
        LIMIT $2
      `, [userId, limit]);
      
      return recent.rows.map((row: any) => row.query);
    } catch (error) {
      console.error('Error getting user recent searches:', error);
      return [];
    }
  }

  async updateUserRecentSearches(userId: number, query: string): Promise<void> {
    // This is handled automatically by trackSearchAnalytics
  }
}

// Use Database storage
export const storage = new DatabaseStorage();