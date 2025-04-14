import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import {
  insertUserSchema,
  insertPostSchema,
  insertCommentSchema,
  insertCircleSchema,
  insertCircleMemberSchema,
  insertLikeSchema,
  insertSavedRestaurantSchema,
  insertRestaurantSchema,
  insertStorySchema,
  insertRestaurantListSchema,
  insertRestaurantListItemSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Error handling middleware
  const handleZodError = (err: any, res: Response) => {
    if (err instanceof ZodError) {
      const formattedError = fromZodError(err);
      return res.status(400).json({ error: formattedError.message });
    }
    return res.status(500).json({ error: err.message || "An error occurred" });
  };

  // Note: The current user endpoint is registered in auth.ts as /api/user

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from all user objects
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Remove password from user object
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User creation is now handled by /api/register in auth.ts

  // Restaurant routes
  app.get("/api/restaurants", async (req, res) => {
    try {
      const { query } = req.query;
      if (query && typeof query === "string") {
        const results = await storage.searchRestaurants(query);
        return res.json(results);
      }
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurant(parseInt(req.params.id));
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
      const restaurantData = insertRestaurantSchema.parse(req.body);
      const newRestaurant = await storage.createRestaurant(restaurantData);
      res.status(201).json(newRestaurant);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // Post routes
  app.get("/api/posts", async (req, res) => {
    try {
      const userId = req.query.userId;
      const restaurantId = req.query.restaurantId;

      if (userId && typeof userId === "string") {
        const posts = await storage.getPostsByUser(parseInt(userId));
        return res.json(posts);
      }

      if (restaurantId && typeof restaurantId === "string") {
        const posts = await storage.getPostsByRestaurant(parseInt(restaurantId));
        return res.json(posts);
      }

      const posts = await storage.getAllPosts();
      res.json(posts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/feed", async (req, res) => {
    try {
      const feedPosts = await storage.getFeedPosts();
      
      // Remove password hashes from all post authors and comment authors
      const safeFeedPosts = feedPosts.map(post => {
        let safePost = { ...post };
        
        // Clean post author
        if (safePost.author && safePost.author.password) {
          const { password, ...authorWithoutPassword } = safePost.author;
          safePost.author = authorWithoutPassword;
        }
        
        // Clean comment authors
        if (safePost.comments && Array.isArray(safePost.comments)) {
          safePost.comments = safePost.comments.map((comment: any) => {
            if (comment.author && comment.author.password) {
              const { password, ...authorWithoutPassword } = comment.author;
              return { ...comment, author: authorWithoutPassword };
            }
            return comment;
          });
        }
        
        return safePost;
      });
      
      res.json(safeFeedPosts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const postDetails = await storage.getPostDetails(parseInt(req.params.id));
      if (!postDetails) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Remove password hash from post author
      let safePostDetails = { ...postDetails };
      if (safePostDetails.author && safePostDetails.author.password) {
        const { password, ...authorWithoutPassword } = safePostDetails.author;
        safePostDetails.author = authorWithoutPassword;
      }
      
      // Remove password hashes from comment authors
      if (safePostDetails.comments && Array.isArray(safePostDetails.comments)) {
        safePostDetails.comments = safePostDetails.comments.map((comment: any) => {
          if (comment.author && comment.author.password) {
            const { password, ...authorWithoutPassword } = comment.author;
            return { ...comment, author: authorWithoutPassword };
          }
          return comment;
        });
      }
      
      res.json(safePostDetails);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const newPost = await storage.createPost(postData);
      res.status(201).json(newPost);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // Comment routes
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPost(parseInt(req.params.postId));
      res.json(comments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const newComment = await storage.createComment(commentData);
      res.status(201).json(newComment);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // Circle routes (social networks for trusted recommendations)
  app.get("/api/circles", async (req, res) => {
    try {
      const circles = await storage.getAllCircles();
      res.json(circles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/circles/featured", async (req, res) => {
    try {
      const featuredCircles = await storage.getFeaturedCircles();
      res.json(featuredCircles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Current user's circles - Authenticated endpoint
  app.get("/api/circles/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const circles = await storage.getCirclesByUser(req.user.id);
      res.json(circles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/circles/:id", async (req, res) => {
    try {
      const circle = await storage.getCircle(parseInt(req.params.id));
      if (!circle) {
        return res.status(404).json({ error: "Circle not found" });
      }
      
      const members = await storage.getCircleMembers(circle.id);
      
      res.json({
        ...circle,
        memberCount: members.length
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/circles", async (req, res) => {
    try {
      const circleData = insertCircleSchema.parse(req.body);
      const newCircle = await storage.createCircle(circleData);
      res.status(201).json(newCircle);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  app.get("/api/users/:userId/circles", async (req, res) => {
    try {
      const userCircles = await storage.getCirclesByUser(parseInt(req.params.userId));
      res.json(userCircles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/circle-members", async (req, res) => {
    try {
      const memberData = insertCircleMemberSchema.parse(req.body);
      const newMember = await storage.createCircleMember(memberData);
      res.status(201).json(newMember);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // Like routes
  app.post("/api/likes", async (req, res) => {
    try {
      const likeData = insertLikeSchema.parse(req.body);
      const newLike = await storage.createLike(likeData);
      res.status(201).json(newLike);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  app.delete("/api/posts/:postId/likes/:userId", async (req, res) => {
    try {
      await storage.deleteLike(
        parseInt(req.params.postId),
        parseInt(req.params.userId)
      );
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/posts/:postId/likes", async (req, res) => {
    try {
      const likes = await storage.getLikesByPost(parseInt(req.params.postId));
      res.json(likes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Saved Restaurant routes
  app.post("/api/saved-restaurants", async (req, res) => {
    try {
      const savedData = insertSavedRestaurantSchema.parse(req.body);
      const newSavedRestaurant = await storage.createSavedRestaurant(savedData);
      res.status(201).json(newSavedRestaurant);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  app.get("/api/users/:userId/saved-restaurants", async (req, res) => {
    try {
      const savedRestaurants = await storage.getSavedRestaurantsByUser(parseInt(req.params.userId));
      res.json(savedRestaurants);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Story routes
  app.get("/api/stories", async (req, res) => {
    try {
      const activeStories = await storage.getActiveStories();
      
      // Group stories by user
      const storiesByUser = new Map();
      
      for (const story of activeStories) {
        const user = await storage.getUser(story.userId);
        if (!user) continue;
        
        // Remove password from user data
        const { password, ...userWithoutPassword } = user;
        
        if (!storiesByUser.has(userWithoutPassword.id)) {
          storiesByUser.set(userWithoutPassword.id, {
            userId: userWithoutPassword.id,
            userName: userWithoutPassword.name,
            profilePicture: userWithoutPassword.profilePicture,
            stories: []
          });
        }
        
        storiesByUser.get(userWithoutPassword.id).stories.push(story);
      }
      
      res.json(Array.from(storiesByUser.values()));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stories", async (req, res) => {
    try {
      const storyData = insertStorySchema.parse(req.body);
      const newStory = await storage.createStory(storyData);
      res.status(201).json(newStory);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // Restaurant List routes
  app.get("/api/restaurant-lists", async (req, res) => {
    try {
      const circleId = req.query.circleId;
      const userId = req.query.userId;
      const publicOnly = req.query.publicOnly === "true";
      
      if (circleId && typeof circleId === "string") {
        const lists = await storage.getRestaurantListsByCircle(parseInt(circleId));
        return res.json(lists);
      }
      
      if (userId && typeof userId === "string") {
        const lists = await storage.getRestaurantListsByUser(parseInt(userId));
        return res.json(lists);
      }
      
      if (publicOnly) {
        const lists = await storage.getPublicRestaurantLists();
        return res.json(lists);
      }
      
      // Default to public lists if no specific query
      const lists = await storage.getPublicRestaurantLists();
      res.json(lists);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Current user's restaurant lists - Authenticated endpoint
  app.get("/api/lists/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const lists = await storage.getRestaurantListsByUser(req.user.id);
      res.json(lists);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.get("/api/restaurant-lists/:id", async (req, res) => {
    try {
      const list = await storage.getRestaurantList(parseInt(req.params.id));
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }
      
      // Get list items with restaurant details
      const listItems = await storage.getDetailedRestaurantsInList(list.id);
      
      // Fix for security vulnerability - remove password from all user objects
      // Clean detailed restaurants list items to remove all user password hashes
      const cleanedListItems = await Promise.all(listItems.map(async item => {
        // Clean the addedBy user object if it exists
        if (item.addedBy && item.addedBy.password) {
          const { password, ...cleanAddedBy } = item.addedBy;
          return { ...item, addedBy: cleanAddedBy };
        }
        return item;
      }));
      
      // Get and clean creator user data
      const creator = await storage.getUser(list.createdById);
      let creatorWithoutPassword = null;
      if (creator) {
        const { password, ...userWithoutPassword } = creator;
        creatorWithoutPassword = userWithoutPassword;
      }
      
      // If the list is associated with a circle, get the circle info
      let circle = null;
      if (list.circleId) {
        circle = await storage.getCircle(list.circleId);
      }
      
      res.json({
        ...list,
        creator: creatorWithoutPassword,
        circle,
        restaurants: cleanedListItems
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.post("/api/restaurant-lists", async (req, res) => {
    try {
      const listData = insertRestaurantListSchema.parse(req.body);
      const newList = await storage.createRestaurantList(listData);
      res.status(201).json(newList);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });
  
  app.post("/api/restaurant-list-items", async (req, res) => {
    try {
      const itemData = insertRestaurantListItemSchema.parse(req.body);
      const newItem = await storage.addRestaurantToList(itemData);
      res.status(201).json(newItem);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });
  
  app.delete("/api/restaurant-lists/:listId/restaurants/:restaurantId", async (req, res) => {
    try {
      await storage.removeRestaurantFromList(
        parseInt(req.params.listId),
        parseInt(req.params.restaurantId)
      );
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Enhanced list management routes
  app.patch("/api/restaurant-lists/:id", async (req, res) => {
    try {
      const updates = req.body;
      const updatedList = await storage.updateRestaurantList(parseInt(req.params.id), updates);
      res.json(updatedList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/restaurant-lists/:id/view", async (req, res) => {
    try {
      const updatedList = await storage.incrementListViewCount(parseInt(req.params.id));
      res.json({ viewCount: updatedList.viewCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/restaurant-lists/:id/save", async (req, res) => {
    try {
      const updatedList = await storage.incrementListSaveCount(parseInt(req.params.id));
      res.json({ saveCount: updatedList.saveCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Location-based discovery routes
  app.get("/api/restaurants/location/:location", async (req, res) => {
    try {
      const restaurants = await storage.getRestaurantsByLocation(req.params.location);
      res.json(restaurants);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurants/nearby", async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      
      if (!lat || !lng || !radius || 
          typeof lat !== 'string' || 
          typeof lng !== 'string' || 
          typeof radius !== 'string') {
        return res.status(400).json({ error: "Missing or invalid parameters" });
      }
      
      const restaurants = await storage.getNearbyRestaurants(
        lat, 
        lng, 
        parseInt(radius)
      );
      
      res.json(restaurants);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurant-lists/location/:location", async (req, res) => {
    try {
      const lists = await storage.getRestaurantListsByLocation(req.params.location);
      res.json(lists);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurant-lists/popular/:location", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const lists = await storage.getPopularRestaurantListsByLocation(req.params.location, limit);
      res.json(lists);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Enhanced list sharing routes
  app.post("/api/shared-lists", async (req, res) => {
    try {
      const { listId, circleId, permissions } = req.body;
      
      if (!listId || !circleId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Ensure user is authenticated for this operation
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "You must be logged in to share lists" });
      }
      
      // Convert permissions to canEdit/canReshare flags
      let canEdit = false;
      let canReshare = false;
      
      if (permissions === "edit" || permissions === "full") {
        canEdit = true;
      }
      
      if (permissions === "full") {
        canReshare = true;
      }
      
      const sharedList = await storage.shareListWithCircle({
        listId,
        circleId,
        sharedById: req.user.id, // Add the authenticated user as the sharer
        canEdit,
        canReshare
      });
      
      res.status(201).json(sharedList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/circles/:circleId/shared-lists", async (req, res) => {
    try {
      const sharedLists = await storage.getSharedListsByCircle(parseInt(req.params.circleId));
      
      // Get full list details for each shared list
      const listsWithDetails = await Promise.all(
        sharedLists.map(async (sharedList) => {
          const list = await storage.getRestaurantList(sharedList.listId);
          const creator = list ? await storage.getUser(list.createdById) : null;
          
          // Remove password from creator data
          let creatorWithoutPassword = null;
          if (creator) {
            const { password, ...userWithoutPassword } = creator;
            creatorWithoutPassword = userWithoutPassword;
          }
          
          return {
            ...sharedList,
            list,
            creator: creatorWithoutPassword
          };
        })
      );
      
      res.json(listsWithDetails);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurant-lists/:listId/shared-with", async (req, res) => {
    try {
      const sharedEntries = await storage.getCirclesListIsSharedWith(parseInt(req.params.listId));
      
      // Get circle details for each shared entry
      const circlesWithDetails = await Promise.all(
        sharedEntries.map(async (sharedEntry) => {
          const circle = await storage.getCircle(sharedEntry.circleId);
          
          return {
            ...sharedEntry,
            circle
          };
        })
      );
      
      res.json(circlesWithDetails);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/restaurant-lists/:listId/shared-with/:circleId", async (req, res) => {
    try {
      await storage.removeListSharingFromCircle(
        parseInt(req.params.listId),
        parseInt(req.params.circleId)
      );
      
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: data.type,
              payload: data.payload
            }));
          }
        });
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  return httpServer;
}
