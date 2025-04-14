import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  insertUserSchema,
  insertPostSchema,
  insertCommentSchema,
  insertHubSchema,
  insertHubMemberSchema,
  insertLikeSchema,
  insertSavedRestaurantSchema,
  insertRestaurantSchema,
  insertStorySchema,
  insertRestaurantListSchema,
  insertRestaurantListItemSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Error handling middleware
  const handleZodError = (err: any, res: Response) => {
    if (err instanceof ZodError) {
      const formattedError = fromZodError(err);
      return res.status(400).json({ error: formattedError.message });
    }
    return res.status(500).json({ error: err.message || "An error occurred" });
  };

  // Current user route - Just for testing purposes
  app.get("/api/me", async (req, res) => {
    try {
      // In a real app, this would come from the session
      // For now, return the first user in the DB as a mock "current user"
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        res.json(users[0]);
      } else {
        res.status(404).json({ error: "No users found" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
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
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

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
      res.json(feedPosts);
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
      res.json(postDetails);
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

  // Hub routes
  app.get("/api/hubs", async (req, res) => {
    try {
      const hubs = await storage.getAllHubs();
      res.json(hubs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubs/featured", async (req, res) => {
    try {
      const featuredHubs = await storage.getFeaturedHubs();
      res.json(featuredHubs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubs/:id", async (req, res) => {
    try {
      const hub = await storage.getHub(parseInt(req.params.id));
      if (!hub) {
        return res.status(404).json({ error: "Hub not found" });
      }
      
      const members = await storage.getHubMembers(hub.id);
      
      res.json({
        ...hub,
        memberCount: members.length
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/hubs", async (req, res) => {
    try {
      const hubData = insertHubSchema.parse(req.body);
      const newHub = await storage.createHub(hubData);
      res.status(201).json(newHub);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  app.get("/api/users/:userId/hubs", async (req, res) => {
    try {
      const userHubs = await storage.getHubsByUser(parseInt(req.params.userId));
      res.json(userHubs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/hub-members", async (req, res) => {
    try {
      const memberData = insertHubMemberSchema.parse(req.body);
      const newMember = await storage.createHubMember(memberData);
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
        
        if (!storiesByUser.has(user.id)) {
          storiesByUser.set(user.id, {
            userId: user.id,
            userName: user.name,
            profilePicture: user.profilePicture,
            stories: []
          });
        }
        
        storiesByUser.get(user.id).stories.push(story);
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
      const hubId = req.query.hubId;
      const userId = req.query.userId;
      const publicOnly = req.query.publicOnly === "true";
      
      if (hubId && typeof hubId === "string") {
        const lists = await storage.getRestaurantListsByHub(parseInt(hubId));
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
  
  app.get("/api/restaurant-lists/:id", async (req, res) => {
    try {
      const list = await storage.getRestaurantList(parseInt(req.params.id));
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }
      
      const listItems = await storage.getDetailedRestaurantsInList(list.id);
      const creator = await storage.getUser(list.createdById);
      
      // If the list is associated with a hub, get the hub info
      let hub = null;
      if (list.hubId) {
        hub = await storage.getHub(list.hubId);
      }
      
      res.json({
        ...list,
        creator,
        hub,
        restaurants: listItems
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

  const httpServer = createServer(app);
  return httpServer;
}
