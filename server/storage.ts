import {
  users, type User, type InsertUser,
  restaurants, type Restaurant, type InsertRestaurant,
  posts, type Post, type InsertPost,
  comments, type Comment, type InsertComment,
  hubs, type Hub, type InsertHub,
  hubMembers, type HubMember, type InsertHubMember,
  likes, type Like, type InsertLike,
  savedRestaurants, type SavedRestaurant, type InsertSavedRestaurant,
  stories, type Story, type InsertStory,
  restaurantLists, type RestaurantList, type InsertRestaurantList,
  restaurantListItems, type RestaurantListItem, type InsertRestaurantListItem,
  sharedLists, type SharedList, type InsertSharedList
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
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
  updateRestaurantList(id: number, updates: Partial<InsertRestaurantList>): Promise<RestaurantList>;
  incrementListViewCount(id: number): Promise<RestaurantList>;
  incrementListSaveCount(id: number): Promise<RestaurantList>;
  
  // Location-based discovery
  getRestaurantsByLocation(location: string): Promise<Restaurant[]>;
  getNearbyRestaurants(lat: string, lng: string, radius: number): Promise<Restaurant[]>;
  getRestaurantListsByLocation(location: string): Promise<RestaurantList[]>;
  getPopularRestaurantListsByLocation(location: string, limit: number): Promise<RestaurantList[]>;
  
  // Enhanced list sharing
  shareListWithCircle(sharedList: InsertSharedList): Promise<SharedList>;
  getSharedListsByCircle(circleId: number): Promise<SharedList[]>;
  getCirclesListIsSharedWith(listId: number): Promise<SharedList[]>;
  isListSharedWithCircle(listId: number, circleId: number): Promise<boolean>;
  getSharedListsPermissions(listId: number, circleId: number): Promise<SharedList | undefined>;
  removeListSharingFromCircle(listId: number, circleId: number): Promise<void>;
  
  // Restaurant List Item operations
  addRestaurantToList(item: InsertRestaurantListItem): Promise<RestaurantListItem>;
  removeRestaurantFromList(listId: number, restaurantId: number): Promise<void>;
  getRestaurantsInList(listId: number): Promise<RestaurantListItem[]>;
  getDetailedRestaurantsInList(listId: number): Promise<any[]>; // with restaurant details
}

export class MemStorage implements IStorage {
  public sessionStore: session.Store;
  
  private users: Map<number, User>;
  private restaurants: Map<number, Restaurant>;
  private posts: Map<number, Post>;
  private comments: Map<number, Comment>;
  private hubs: Map<number, Hub>;
  private hubMembers: Map<number, HubMember>;
  private likes: Map<number, Like>;
  private savedRestaurants: Map<number, SavedRestaurant>;
  private stories: Map<number, Story>;
  private restaurantLists: Map<number, RestaurantList>;
  private restaurantListItems: Map<number, RestaurantListItem>;
  private sharedLists: Map<number, SharedList>;

  private userId: number;
  private restaurantId: number;
  private postId: number;
  private commentId: number;
  private hubId: number;
  private hubMemberId: number;
  private likeId: number;
  private savedRestaurantId: number;
  private storyId: number;
  private restaurantListId: number;
  private restaurantListItemId: number;
  private sharedListId: number;

  constructor() {
    // Initialize session store for authentication
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    this.users = new Map();
    this.restaurants = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.hubs = new Map();
    this.hubMembers = new Map();
    this.likes = new Map();
    this.savedRestaurants = new Map();
    this.stories = new Map();
    this.restaurantLists = new Map();
    this.restaurantListItems = new Map();
    this.sharedLists = new Map();

    this.userId = 1;
    this.restaurantId = 1;
    this.postId = 1;
    this.commentId = 1;
    this.hubId = 1;
    this.hubMemberId = 1;
    this.likeId = 1;
    this.savedRestaurantId = 1;
    this.storyId = 1;
    this.restaurantListId = 1;
    this.restaurantListItemId = 1;
    this.sharedListId = 1;

    // Initialize with some data
    this.initializeData();
  }

  private initializeData() {
    // Create initial users
    const user1 = this.createUser({
      username: "foodieSofia",
      password: "password123",
      name: "Sofia Chen",
      bio: "Food enthusiast exploring NYC's culinary scene",
      profilePicture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80"
    });

    const user2 = this.createUser({
      username: "chefJames",
      password: "password123",
      name: "James Wilson",
      bio: "Amateur chef and restaurant critic",
      profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80"
    });

    const user3 = this.createUser({
      username: "tasteEmma",
      password: "password123",
      name: "Emma Rodriguez",
      bio: "Finding the best hidden gems in every city",
      profilePicture: "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80"
    });

    // Create initial restaurants
    const restaurant1 = this.createRestaurant({
      name: "Little Italy Trattoria",
      location: "Downtown, New York City",
      category: "Italian",
      priceRange: "$$"
    });

    const restaurant2 = this.createRestaurant({
      name: "Blue Ocean Sushi",
      location: "SoHo, New York City",
      category: "Japanese",
      priceRange: "$$$"
    });

    const restaurant3 = this.createRestaurant({
      name: "Spice Avenue",
      location: "Midtown, New York City",
      category: "Indian",
      priceRange: "$$"
    });

    // Create initial hubs
    const hub1 = this.createHub({
      name: "Italian Cuisine",
      description: "For lovers of Italian food",
      category: "Cuisine",
      image: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    });

    const hub2 = this.createHub({
      name: "Japanese Delights",
      description: "Explore sushi, ramen, and more",
      category: "Cuisine",
      image: "https://images.unsplash.com/photo-1617196035154-1e7e6e28b0db?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    });

    const hub3 = this.createHub({
      name: "NYC Dining Scene",
      description: "The best restaurants in NYC",
      category: "Location",
      image: "https://images.unsplash.com/photo-1508615263227-c5d58c1e5821?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    });

    // Create initial hub members
    this.createHubMember({
      hubId: hub1.id,
      userId: user1.id
    });

    this.createHubMember({
      hubId: hub2.id,
      userId: user1.id
    });

    this.createHubMember({
      hubId: hub3.id,
      userId: user3.id
    });

    // Create initial posts
    const post1 = this.createPost({
      userId: user2.id,
      restaurantId: restaurant1.id,
      content: "Finally tried the famous truffle pasta at Little Italy Trattoria! The ambiance was perfect for date night, and the service was exceptional. Must try the tiramisu for dessert - absolutely heavenly! 😍",
      rating: 5,
      visibility: "Public",
      dishesTried: ["Truffle Pasta", "Caprese Salad", "Tiramisu"],
      images: ["https://images.unsplash.com/photo-1595295333158-4742f28fbd85?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", "https://images.unsplash.com/photo-1581873372796-635b67ca2008?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"]
    });

    const post2 = this.createPost({
      userId: user3.id,
      restaurantId: restaurant2.id,
      content: "This omakase experience at Blue Ocean Sushi was worth every penny! Chef Takashi's attention to detail is impressive. The fish was incredibly fresh, and the sake pairing was perfect. Great place for special occasions! 🍣✨",
      rating: 4,
      visibility: "NYC Dining Scene",
      dishesTried: ["Omakase Set", "Sake Flight", "Matcha Ice Cream"],
      images: ["https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"]
    });

    // Create initial comments
    this.createComment({
      postId: post1.id,
      userId: user3.id,
      content: "That pasta looks incredible! Did you make a reservation or just walk in?"
    });

    this.createComment({
      postId: post2.id,
      userId: user1.id,
      content: "How much was the omakase? Been wanting to try this place!"
    });

    this.createComment({
      postId: post2.id,
      userId: user3.id,
      content: "It was $150 per person, but totally worth it! They have a more affordable option at $85 too."
    });

    // Create initial likes
    this.createLike({
      postId: post1.id,
      userId: user1.id
    });

    this.createLike({
      postId: post2.id,
      userId: user2.id
    });

    // Create initial stories
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.createStory({
      userId: user2.id,
      content: "Trying out a new pizza place",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
      expiresAt: tomorrow
    });

    this.createStory({
      userId: user3.id,
      content: "Best sushi in town",
      image: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
      expiresAt: tomorrow
    });
    
    // Create initial restaurant lists
    const italianRestaurants = this.createRestaurantList({
      name: "Best Italian Restaurants in NYC",
      description: "A curated list of the most authentic Italian places",
      createdById: user1.id,
      hubId: hub1.id,
      isPublic: true,
      tags: ["Italian", "Pasta", "Pizza"]
    });
    
    const dateNightSpots = this.createRestaurantList({
      name: "Romantic Date Night Spots",
      description: "Perfect restaurants for a special evening",
      createdById: user2.id,
      isPublic: true,
      tags: ["Romantic", "Special Occasion", "Date Night"]
    });
    
    const hiddenGems = this.createRestaurantList({
      name: "Hidden Gems Only Locals Know",
      description: "Off-the-beaten-path restaurants that tourists don't know about",
      createdById: user3.id,
      hubId: hub3.id,
      isPublic: false,
      tags: ["Hidden", "Local", "Authentic"]
    });
    
    // Add restaurants to lists
    this.addRestaurantToList({
      listId: italianRestaurants.id,
      restaurantId: restaurant1.id,
      notes: "Their truffle pasta is to die for!",
      mustTryDishes: ["Truffle Pasta", "Tiramisu"],
      addedById: user1.id,
      position: 1
    });
    
    this.addRestaurantToList({
      listId: dateNightSpots.id,
      restaurantId: restaurant1.id,
      notes: "Request a table by the window for a romantic view",
      mustTryDishes: ["Tiramisu"],
      addedById: user2.id,
      position: 1
    });
    
    this.addRestaurantToList({
      listId: dateNightSpots.id,
      restaurantId: restaurant2.id,
      notes: "Great ambiance for a date, but can be pricey",
      mustTryDishes: ["Omakase Set", "Sake Flight"],
      addedById: user2.id,
      position: 2
    });
    
    this.addRestaurantToList({
      listId: hiddenGems.id,
      restaurantId: restaurant3.id,
      notes: "Authentic Indian cuisine in a hole-in-the-wall setting",
      mustTryDishes: ["Butter Chicken", "Garlic Naan"],
      addedById: user3.id,
      position: 1
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Restaurant operations
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const id = this.restaurantId++;
    const restaurant: Restaurant = { ...insertRestaurant, id };
    this.restaurants.set(id, restaurant);
    return restaurant;
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values());
  }

  async searchRestaurants(query: string): Promise<Restaurant[]> {
    const lowerCaseQuery = query.toLowerCase();
    return Array.from(this.restaurants.values()).filter(
      restaurant => 
        restaurant.name.toLowerCase().includes(lowerCaseQuery) ||
        restaurant.category.toLowerCase().includes(lowerCaseQuery) ||
        restaurant.location.toLowerCase().includes(lowerCaseQuery)
    );
  }

  // Post operations
  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postId++;
    const createdAt = new Date();
    const post: Post = { ...insertPost, id, createdAt };
    this.posts.set(id, post);
    return post;
  }

  async getAllPosts(): Promise<Post[]> {
    return Array.from(this.posts.values());
  }

  async getPostsByUser(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values()).filter(
      post => post.userId === userId
    );
  }

  async getPostsByRestaurant(restaurantId: number): Promise<Post[]> {
    return Array.from(this.posts.values()).filter(
      post => post.restaurantId === restaurantId
    );
  }

  async getPostDetails(postId: number): Promise<any> {
    const post = await this.getPost(postId);
    if (!post) return null;

    const user = await this.getUser(post.userId);
    const restaurant = await this.getRestaurant(post.restaurantId);
    const comments = await this.getCommentsByPost(postId);
    const likes = await this.getLikesByPost(postId);

    const commentDetails = await Promise.all(
      comments.map(async (comment) => {
        const commentUser = await this.getUser(comment.userId);
        return {
          ...comment,
          author: commentUser
        };
      })
    );

    return {
      ...post,
      author: user,
      restaurant,
      comments: commentDetails,
      likeCount: likes.length
    };
  }

  async getFeedPosts(): Promise<any[]> {
    const posts = await this.getAllPosts();
    const sortedPosts = posts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return Promise.all(
      sortedPosts.map(async (post) => {
        return await this.getPostDetails(post.id);
      })
    );
  }

  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentId++;
    const createdAt = new Date();
    const comment: Comment = { ...insertComment, id, createdAt };
    this.comments.set(id, comment);
    return comment;
  }

  async getCommentsByPost(postId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(
      comment => comment.postId === postId
    );
  }

  // Circle operations (using the same Hub table underneath)
  async getCircle(id: number): Promise<Hub | undefined> {
    return this.hubs.get(id);
  }

  async createCircle(circle: InsertHub): Promise<Hub> {
    const id = this.hubId++;
    const createdAt = new Date();
    const hub: Hub = { ...circle, id, createdAt };
    this.hubs.set(id, hub);
    return hub;
  }

  async getAllCircles(): Promise<Hub[]> {
    return Array.from(this.hubs.values());
  }

  async getFeaturedCircles(): Promise<Hub[]> {
    // Same implementation as getFeaturedHubs, using the existing Hub data
    const circles = await this.getAllCircles();
    // Return a subset of circles as featured (for demo purposes)
    return circles.slice(0, 3);
  }
  
  async getCircleMembers(circleId: number): Promise<HubMember[]> {
    return Array.from(this.hubMembers.values()).filter(
      member => member.hubId === circleId
    );
  }
  
  async getCirclesByUser(userId: number): Promise<Hub[]> {
    const memberEntries = Array.from(this.hubMembers.values()).filter(
      member => member.userId === userId
    );
    
    const circleIds = memberEntries.map(entry => entry.hubId);
    
    return Array.from(this.hubs.values()).filter(
      hub => circleIds.includes(hub.id)
    );
  }
  
  async createCircleMember(circleMember: InsertHubMember): Promise<HubMember> {
    const id = this.hubMemberId++;
    const joinedAt = new Date();
    const hubMember: HubMember = { ...circleMember, id, joinedAt };
    this.hubMembers.set(id, hubMember);
    return hubMember;
  }
  
  async isUserMemberOfCircle(userId: number, circleId: number): Promise<boolean> {
    return Array.from(this.hubMembers.values()).some(
      member => member.hubId === circleId && member.userId === userId
    );
  }
  
  // Hub operations (legacy implementations that delegate to Circle methods)
  async getHub(id: number): Promise<Hub | undefined> {
    return this.getCircle(id);
  }

  async createHub(insertHub: InsertHub): Promise<Hub> {
    return this.createCircle(insertHub);
  }

  async getAllHubs(): Promise<Hub[]> {
    return this.getAllCircles();
  }

  async getFeaturedHubs(): Promise<Hub[]> {
    const allHubs = await this.getAllHubs();
    return allHubs.slice(0, 3); // Return first 3 hubs as featured
  }

  // Hub Member operations
  async createHubMember(insertHubMember: InsertHubMember): Promise<HubMember> {
    const id = this.hubMemberId++;
    const joinedAt = new Date();
    const hubMember: HubMember = { ...insertHubMember, id, joinedAt };
    this.hubMembers.set(id, hubMember);
    return hubMember;
  }

  async getHubMembers(hubId: number): Promise<HubMember[]> {
    return Array.from(this.hubMembers.values()).filter(
      member => member.hubId === hubId
    );
  }

  async getHubsByUser(userId: number): Promise<Hub[]> {
    const userMemberships = Array.from(this.hubMembers.values()).filter(
      member => member.userId === userId
    );
    
    return Promise.all(
      userMemberships.map(async membership => {
        const hub = await this.getHub(membership.hubId);
        return hub!;
      })
    );
  }

  async isUserMemberOfHub(userId: number, hubId: number): Promise<boolean> {
    const members = await this.getHubMembers(hubId);
    return members.some(member => member.userId === userId);
  }

  // Like operations
  async createLike(insertLike: InsertLike): Promise<Like> {
    // Check if like already exists
    const existingLike = Array.from(this.likes.values()).find(
      like => like.postId === insertLike.postId && like.userId === insertLike.userId
    );
    
    if (existingLike) {
      return existingLike;
    }
    
    const id = this.likeId++;
    const createdAt = new Date();
    const like: Like = { ...insertLike, id, createdAt };
    this.likes.set(id, like);
    return like;
  }

  async deleteLike(postId: number, userId: number): Promise<void> {
    const likeToDelete = Array.from(this.likes.values()).find(
      like => like.postId === postId && like.userId === userId
    );
    
    if (likeToDelete) {
      this.likes.delete(likeToDelete.id);
    }
  }

  async getLikesByPost(postId: number): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(
      like => like.postId === postId
    );
  }

  async isPostLikedByUser(postId: number, userId: number): Promise<boolean> {
    return Array.from(this.likes.values()).some(
      like => like.postId === postId && like.userId === userId
    );
  }

  // Saved Restaurant operations
  async createSavedRestaurant(insertSavedRestaurant: InsertSavedRestaurant): Promise<SavedRestaurant> {
    const id = this.savedRestaurantId++;
    const savedAt = new Date();
    const savedRestaurant: SavedRestaurant = { ...insertSavedRestaurant, id, savedAt };
    this.savedRestaurants.set(id, savedRestaurant);
    return savedRestaurant;
  }

  async getSavedRestaurantsByUser(userId: number): Promise<SavedRestaurant[]> {
    return Array.from(this.savedRestaurants.values()).filter(
      saved => saved.userId === userId
    );
  }

  // Story operations
  async createStory(insertStory: InsertStory): Promise<Story> {
    const id = this.storyId++;
    const createdAt = new Date();
    const story: Story = { ...insertStory, id, createdAt };
    this.stories.set(id, story);
    return story;
  }

  async getActiveStories(): Promise<Story[]> {
    const now = new Date();
    return Array.from(this.stories.values()).filter(
      story => new Date(story.expiresAt) > now
    );
  }

  async getStoriesByUser(userId: number): Promise<Story[]> {
    const now = new Date();
    return Array.from(this.stories.values()).filter(
      story => story.userId === userId && new Date(story.expiresAt) > now
    );
  }

  // Restaurant List operations
  async createRestaurantList(list: InsertRestaurantList): Promise<RestaurantList> {
    const id = this.restaurantListId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const restaurantList: RestaurantList = { ...list, id, createdAt, updatedAt };
    this.restaurantLists.set(id, restaurantList);
    return restaurantList;
  }
  
  async getRestaurantList(id: number): Promise<RestaurantList | undefined> {
    return this.restaurantLists.get(id);
  }
  
  async getRestaurantListsByHub(hubId: number): Promise<RestaurantList[]> {
    return Array.from(this.restaurantLists.values()).filter(
      list => list.hubId === hubId
    );
  }
  
  async getRestaurantListsByCircle(circleId: number): Promise<RestaurantList[]> {
    return this.getRestaurantListsByHub(circleId);
  }
  
  async getRestaurantListsByUser(userId: number): Promise<RestaurantList[]> {
    return Array.from(this.restaurantLists.values()).filter(
      list => list.createdById === userId
    );
  }
  
  async getPublicRestaurantLists(): Promise<RestaurantList[]> {
    return Array.from(this.restaurantLists.values()).filter(
      list => list.isPublic
    );
  }
  
  // Restaurant List Item operations
  async addRestaurantToList(item: InsertRestaurantListItem): Promise<RestaurantListItem> {
    const id = this.restaurantListItemId++;
    const addedAt = new Date();
    const listItem: RestaurantListItem = { ...item, id, addedAt };
    this.restaurantListItems.set(id, listItem);
    return listItem;
  }
  
  async removeRestaurantFromList(listId: number, restaurantId: number): Promise<void> {
    const itemToRemove = Array.from(this.restaurantListItems.values()).find(
      item => item.listId === listId && item.restaurantId === restaurantId
    );
    
    if (itemToRemove) {
      this.restaurantListItems.delete(itemToRemove.id);
    }
  }
  
  async getRestaurantsInList(listId: number): Promise<RestaurantListItem[]> {
    return Array.from(this.restaurantListItems.values())
      .filter(item => item.listId === listId)
      .sort((a, b) => a.position - b.position);
  }
  
  async getDetailedRestaurantsInList(listId: number): Promise<any[]> {
    const listItems = await this.getRestaurantsInList(listId);
    
    return Promise.all(
      listItems.map(async (item) => {
        const restaurant = await this.getRestaurant(item.restaurantId);
        const addedBy = await this.getUser(item.addedById);
        
        return {
          ...item,
          restaurant,
          addedBy
        };
      })
    );
  }

  // Restaurant List enhanced operations
  async updateRestaurantList(id: number, updates: Partial<InsertRestaurantList>): Promise<RestaurantList> {
    const list = await this.getRestaurantList(id);
    if (!list) throw new Error(`Restaurant list with ID ${id} not found`);
    
    const updatedList = { ...list, ...updates, updatedAt: new Date() };
    this.restaurantLists.set(id, updatedList);
    
    return updatedList;
  }
  
  async incrementListViewCount(id: number): Promise<RestaurantList> {
    const list = await this.getRestaurantList(id);
    if (!list) throw new Error(`Restaurant list with ID ${id} not found`);
    
    const viewCount = (list.viewCount || 0) + 1;
    const updatedList = { ...list, viewCount, updatedAt: new Date() };
    this.restaurantLists.set(id, updatedList);
    
    return updatedList;
  }
  
  async incrementListSaveCount(id: number): Promise<RestaurantList> {
    const list = await this.getRestaurantList(id);
    if (!list) throw new Error(`Restaurant list with ID ${id} not found`);
    
    const saveCount = (list.saveCount || 0) + 1;
    const updatedList = { ...list, saveCount, updatedAt: new Date() };
    this.restaurantLists.set(id, updatedList);
    
    return updatedList;
  }
  
  // Location-based discovery methods
  async getRestaurantsByLocation(location: string): Promise<Restaurant[]> {
    const lowerCaseLocation = location.toLowerCase();
    return Array.from(this.restaurants.values()).filter(
      restaurant => 
        restaurant.location?.toLowerCase().includes(lowerCaseLocation) ||
        restaurant.city?.toLowerCase().includes(lowerCaseLocation) ||
        restaurant.neighborhood?.toLowerCase().includes(lowerCaseLocation) ||
        restaurant.state?.toLowerCase().includes(lowerCaseLocation)
    );
  }
  
  async getNearbyRestaurants(lat: string, lng: string, radius: number): Promise<Restaurant[]> {
    // In a real implementation, this would use geospatial queries
    // For the in-memory implementation, we'll return restaurants based on the city/state match
    // as a simplification
    return Array.from(this.restaurants.values());
  }
  
  async getRestaurantListsByLocation(location: string): Promise<RestaurantList[]> {
    // Get restaurants by location
    const restaurantsByLocation = await this.getRestaurantsByLocation(location);
    const restaurantIds = restaurantsByLocation.map(r => r.id);
    
    // Get list items that contain those restaurants
    const relevantListItems = Array.from(this.restaurantListItems.values())
      .filter(item => restaurantIds.includes(item.restaurantId));
    
    // Get the unique list IDs
    const listIds = [...new Set(relevantListItems.map(item => item.listId))];
    
    // Get the full list data for those IDs
    const lists = await Promise.all(
      listIds.map(id => this.getRestaurantList(id))
    );
    
    return lists.filter(list => list && list.isPublic) as RestaurantList[];
  }
  
  async getPopularRestaurantListsByLocation(location: string, limit: number): Promise<RestaurantList[]> {
    const lists = await this.getRestaurantListsByLocation(location);
    
    // Sort by view count and save count (popularity)
    return lists
      .sort((a, b) => {
        const aPopularity = (a.viewCount || 0) + (a.saveCount || 0) * 2;
        const bPopularity = (b.viewCount || 0) + (b.saveCount || 0) * 2;
        return bPopularity - aPopularity;
      })
      .slice(0, limit);
  }
  
  // Enhanced list sharing
  async shareListWithCircle(sharedList: InsertSharedList): Promise<SharedList> {
    const id = this.sharedListId++;
    const sharedAt = new Date();
    
    const newSharedList: SharedList = {
      ...sharedList,
      id,
      sharedAt
    };
    
    this.sharedLists.set(id, newSharedList);
    return newSharedList;
  }
  
  async getSharedListsByCircle(circleId: number): Promise<SharedList[]> {
    return Array.from(this.sharedLists.values())
      .filter(sharedList => sharedList.circleId === circleId);
  }
  
  async getCirclesListIsSharedWith(listId: number): Promise<SharedList[]> {
    return Array.from(this.sharedLists.values())
      .filter(sharedList => sharedList.listId === listId);
  }
  
  async isListSharedWithCircle(listId: number, circleId: number): Promise<boolean> {
    return Array.from(this.sharedLists.values()).some(
      sharedList => sharedList.listId === listId && sharedList.circleId === circleId
    );
  }
  
  async getSharedListsPermissions(listId: number, circleId: number): Promise<SharedList | undefined> {
    return Array.from(this.sharedLists.values()).find(
      sharedList => sharedList.listId === listId && sharedList.circleId === circleId
    );
  }
  
  async removeListSharingFromCircle(listId: number, circleId: number): Promise<void> {
    const sharedListToRemove = Array.from(this.sharedLists.values()).find(
      sharedList => sharedList.listId === listId && sharedList.circleId === circleId
    );
    
    if (sharedListToRemove) {
      this.sharedLists.delete(sharedListToRemove.id);
    }
  }
}

export const storage = new MemStorage();
