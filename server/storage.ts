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
  restaurantListItems, type RestaurantListItem, type InsertRestaurantListItem
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, gt, or } from "drizzle-orm";
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
  getAllUsers(): Promise<User[]>;
  
  // Restaurant operations
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  getAllRestaurants(): Promise<Restaurant[]>;
  searchRestaurants(query: string): Promise<Restaurant[]>;
  
  // Post operations
  getPost(id: number): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  getAllPosts(): Promise<Post[]>;
  getPostsByUser(userId: number): Promise<Post[]>;
  getPostsByRestaurant(restaurantId: number): Promise<Post[]>;
  getPostDetails(postId: number): Promise<any>;
  getFeedPosts(): Promise<any[]>;
  
  // Comment operations
  getComment(id: number): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPost(postId: number): Promise<Comment[]>;
  
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
  getRestaurantListsByHub(hubId: number): Promise<RestaurantList[]>;
  getRestaurantListsByCircle(circleId: number): Promise<RestaurantList[]>;
  getRestaurantListsByUser(userId: number): Promise<RestaurantList[]>;
  getPublicRestaurantLists(): Promise<RestaurantList[]>;
  
  // Restaurant List Item operations
  addRestaurantToList(item: InsertRestaurantListItem): Promise<RestaurantListItem>;
  removeRestaurantFromList(listId: number, restaurantId: number): Promise<void>;
  getRestaurantsInList(listId: number): Promise<RestaurantListItem[]>;
  getDetailedRestaurantsInList(listId: number): Promise<any[]>; // with restaurant details
  
  // Session store for authentication
  sessionStore: session.SessionStore;
  
  // Analytics operations
  logUserAction(userId: number, action: string, metadata: Record<string, any>): Promise<void>;
  getActionsByUser(userId: number): Promise<any[]>;
  getPopularContent(): Promise<any[]>;
}

// Implementation using PostgreSQL Database via Drizzle ORM
export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    this.initializeAnalyticsTable();
  }
  
  private async initializeAnalyticsTable() {
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
          like(restaurants.category, `%${query}%`)
        )
      );
      
      console.log(`Search results for "${query}":`, results);
      return results;
    } catch (error) {
      console.error(`Error searching restaurants for "${query}":`, error);
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

  async getFeedPosts(): Promise<any[]> {
    const allPosts = await this.getAllPosts();
    
    const postsWithDetails = await Promise.all(
      allPosts.map(async (post) => {
        const [author] = await db.select().from(users).where(eq(users.id, post.userId));
        const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, post.restaurantId));
        const likeCount = await this.getLikesByPost(post.id).then(likes => likes.length);
        
        return {
          ...post,
          author,
          restaurant,
          likeCount
        };
      })
    );
    
    return postsWithDetails;
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

  async getCommentsByPost(postId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.postId, postId));
  }
  
  // Circle operations
  async getCircle(id: number): Promise<Circle | undefined> {
    const [circle] = await db.select().from(circles).where(eq(circles.id, id));
    return circle;
  }

  async createCircle(insertCircle: InsertCircle): Promise<Circle> {
    const [circle] = await db.insert(circles).values({
      ...insertCircle,
      createdAt: new Date()
    }).returning();
    return circle;
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

  // Analytics operations
  async logUserAction(userId: number, action: string, metadata: Record<string, any>): Promise<void> {
    await db.execute(
      `INSERT INTO analytics (user_id, action, metadata) VALUES ($1, $2, $3)`,
      [userId, action, JSON.stringify(metadata)]
    );
  }

  async getActionsByUser(userId: number): Promise<any[]> {
    const result = await db.execute(
      `SELECT * FROM analytics WHERE user_id = $1 ORDER BY timestamp DESC`, 
      [userId]
    );
    return result.rows;
  }

  async getPopularContent(): Promise<any[]> {
    const result = await db.execute(`
      SELECT 
        metadata->>'contentId' as content_id, 
        COUNT(*) as view_count 
      FROM analytics 
      WHERE action = 'view_content' 
      GROUP BY metadata->>'contentId' 
      ORDER BY view_count DESC 
      LIMIT 10
    `);
    return result.rows;
  }
}

// Use Database storage
export const storage = new DatabaseStorage();