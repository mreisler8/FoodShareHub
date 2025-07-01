import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { searchGooglePlaces, getPlaceDetails } from "./services/google-places";
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
import express from "express";
const app = express();
// … other app.use() calls …

export async function registerRoutes(app: Express): Promise<Server> {
  try {
    console.log("Setting up authentication...");
    // Set up authentication
    setupAuth(app);
    console.log("Authentication setup complete");
  } catch (error) {
    console.error("Failed to setup authentication:", error);
    throw error;
  }

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
      const usersWithoutPasswords = users.map((user) => {
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

  // User following routes
  app.post("/api/user/follow/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const followerId = req.user!.id;
      const followingId = parseInt(req.params.userId, 10);

      // Validate the userId is a number
      if (isNaN(followingId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if the user exists
      const userToFollow = await storage.getUser(followingId);
      if (!userToFollow) {
        return res.status(404).json({ error: "User not found" });
      }

      const followRelationship = await storage.followUser(
        followerId,
        followingId,
      );
      res.status(201).json(followRelationship);
    } catch (err: any) {
      if (
        err.message === "Already following this user" ||
        err.message === "Users cannot follow themselves"
      ) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message || "An error occurred" });
    }
  });

  app.delete("/api/user/follow/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const followerId = req.user!.id;
      const followingId = parseInt(req.params.userId, 10);

      // Validate the userId is a number
      if (isNaN(followingId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if the user exists
      const userToUnfollow = await storage.getUser(followingId);
      if (!userToUnfollow) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.unfollowUser(followerId, followingId);
      res.status(200).json({ message: "Successfully unfollowed user" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "An error occurred" });
    }
  });

  app.get("/api/user/following/status/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const followerId = req.user!.id;
      const followingId = parseInt(req.params.userId, 10);

      // Validate the userId is a number
      if (isNaN(followingId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const isFollowing = await storage.isUserFollowing(
        followerId,
        followingId,
      );
      res.json({ isFollowing });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "An error occurred" });
    }
  });

  app.get("/api/user/:userId/followers", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);

      // Validate the userId is a number
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const followers = await storage.getFollowers(userId);

      // Remove passwords from followers
      const safeFollowers = followers.map((follower) => {
        const { password, ...safeFollower } = follower;
        return safeFollower;
      });

      res.json(safeFollowers);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "An error occurred" });
    }
  });

  app.get("/api/user/:userId/following", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);

      // Validate the userId is a number
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const following = await storage.getFollowing(userId);

      // Remove passwords from followed users
      const safeFollowing = following.map((followed) => {
        const { password, ...safeFollowed } = followed;
        return safeFollowed;
      });

      res.json(safeFollowing);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "An error occurred" });
    }
  });

  // Restaurant routes
  app.get("/api/restaurants", async (req, res) => {
    try {
      const { query, location } = req.query;

      console.log(`Restaurant search request received with params:`, {
        query,
        location,
      });

      // Search by query text
      if (query && typeof query === "string") {
        console.log(`Searching restaurants with query: "${query}"`);

        // First search local database
        const dbResults = await storage.searchRestaurants(query);
        console.log(
          `Local database search returned ${dbResults.length} results`,
        );
        if (dbResults.length > 0) {
          console.log(
            `First local result: ${JSON.stringify(dbResults[0].name)}`,
          );
        }

        // Then search Google Places API
        console.log(`Searching Google Places for: "${query}"`);
        const googleResults = await searchGooglePlaces(query);
        console.log(
          `Google Places search returned ${googleResults.length} results`,
        );
        if (googleResults.length > 0) {
          console.log(
            `First Google result: ${JSON.stringify(googleResults[0].name)}`,
          );
        }

        // Filter out Google results that already exist in the database to avoid duplicates
        const filteredGoogleResults = googleResults.filter(
          (gr) =>
            !dbResults.some((dr) => dr.googlePlaceId === gr.googlePlaceId),
        );
        console.log(
          `After filtering duplicates, using ${filteredGoogleResults.length} Google results`,
        );

        // Combine results, with local database results first
        const combinedResults = [...dbResults, ...filteredGoogleResults];
        console.log(
          `Found ${dbResults.length} local results and ${filteredGoogleResults.length} unique Google results, total: ${combinedResults.length}`,
        );

        return res.json(combinedResults);
      }

      // Search by location
      if (location && typeof location === "string") {
        console.log(`Searching restaurants by location: "${location}"`);

        // First search local database
        const dbResults = await storage.searchRestaurantsByLocation(location);
        console.log(
          `Local database location search returned ${dbResults.length} results`,
        );

        // Then search Google Places API
        console.log(`Searching Google Places for location: "${location}"`);
        const googleResults = await searchGooglePlaces(location);
        console.log(
          `Google Places location search returned ${googleResults.length} results`,
        );

        // Filter out Google results that already exist in the database
        const filteredGoogleResults = googleResults.filter(
          (gr) =>
            !dbResults.some((dr) => dr.googlePlaceId === gr.googlePlaceId),
        );

        // Combine results, with local database results first
        const combinedResults = [...dbResults, ...filteredGoogleResults];
        console.log(
          `Combined location results: ${combinedResults.length} total`,
        );

        return res.json(combinedResults);
      }

      // Return all restaurants if no query parameters
      console.log("No query or location provided, returning all restaurants");
      const restaurants = await storage.getAllRestaurants();
      console.log(`Returning ${restaurants.length} restaurants from database`);
      res.json(restaurants);
    } catch (err: any) {
      console.error("Error in /api/restaurants:", err);
      console.error(err.stack); // Log stack trace for better debugging
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

  // Google Places details endpoint
  app.get("/api/google/places/:placeId", async (req, res) => {
    try {
      const placeId = req.params.placeId;
      console.log(`Fetching Google Place details for ID: ${placeId}`);

      const details = await getPlaceDetails(placeId);
      if (!details) {
        return res.status(404).json({ error: "Place details not found" });
      }

      res.json(details);
    } catch (err: any) {
      console.error("Error fetching Google Place details:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Save a Google Place to our database
  app.post("/api/google/places/save", async (req, res) => {
    try {
      const { placeId } = req.body;

      if (!placeId) {
        return res.status(400).json({ error: "Google Place ID is required" });
      }

      console.log(`Saving Google Place to database, ID: ${placeId}`);

      // Get place details from Google
      const placeDetails = await getPlaceDetails(placeId);
      if (!placeDetails) {
        return res.status(404).json({ error: "Place details not found" });
      }

      // Check if restaurant already exists in our database with this Google Place ID
      const existingRestaurants = await storage.searchRestaurants(
        placeDetails.name || "",
      );
      const existingRestaurant = existingRestaurants.find(
        (r) => r.googlePlaceId === placeId,
      );

      if (existingRestaurant) {
        console.log(
          `Restaurant already exists in database with ID: ${existingRestaurant.id}`,
        );
        return res.json(existingRestaurant);
      }

      // Create a new restaurant in our database
      const restaurantData = {
        name: placeDetails.name || "",
        location:
          placeDetails.address?.split(",").slice(-2).join(",").trim() || "",
        category: placeDetails.category || "Restaurant",
        priceRange: placeDetails.priceRange || "$$",
        googlePlaceId: placeId,
        address: placeDetails.address || "",
        website: placeDetails.website,
        phone: placeDetails.phone,
        latitude: placeDetails.latitude,
        longitude: placeDetails.longitude,
        cuisine: placeDetails.category,
        hours: placeDetails.hours,
      };

      const newRestaurant = await storage.createRestaurant(restaurantData);
      console.log(
        `Saved Google Place to database with ID: ${newRestaurant.id}`,
      );

      res.status(201).json(newRestaurant);
    } catch (err: any) {
      console.error("Error saving Google Place to database:", err);
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
        const posts = await storage.getPostsByRestaurant(
          parseInt(restaurantId),
        );
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
      if (!req.isAuthenticated()) {
        return res
          .status(401)
          .json({ error: "You must be logged in to view your feed" });
      }

      // Get feed posts with pagination support
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      // Add query validation
      if (isNaN(page) || page < 1) {
        return res.status(400).json({ error: "Invalid page parameter" });
      }

      if (isNaN(limit) || limit < 1 || limit > 50) {
        return res.status(400).json({ error: "Invalid limit parameter" });
      }

      // Apply offset pagination
      const offset = (page - 1) * limit;

      // Get paginated posts with new optimized method
      const feedPosts = await storage.getFeedPosts({
        userId: req.user.id,
        offset,
        limit,
      });

      // Make sure the posts are safe (no password info)
      const safeFeedPosts = feedPosts.map((post) => {
        // Clean post author using destructuring
        const { author, comments = [], ...postData } = post;
        let cleanAuthor = null;

        if (author) {
          const { password, ...authorWithoutPassword } = author;
          cleanAuthor = authorWithoutPassword;
        }

        // Process comments if they exist
        const cleanComments = Array.isArray(comments)
          ? comments.map((comment) => {
              if (!comment || !comment.author) return comment;
              const { password, ...authorData } = comment.author;
              return { ...comment, author: authorData };
            })
          : [];

        return {
          ...postData,
          author: cleanAuthor,
          comments: cleanComments,
        };
      });

      // Get total count from the posts list
      // In this approach we just count from the first post
      const total = feedPosts.length > 0 ? feedPosts[0].totalPosts || 0 : 0;
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      // Create pagination info
      const pagination = {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      };

      res.json({
        posts: safeFeedPosts,
        pagination,
      });
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
        safePostDetails.comments = safePostDetails.comments.map(
          (comment: any) => {
            if (comment.author && comment.author.password) {
              const { password, ...authorWithoutPassword } = comment.author;
              return { ...comment, author: authorWithoutPassword };
            }
            return comment;
          },
        );
      }

      res.json(safePostDetails);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postData = insertPostSchema.parse(req.body);
      const newPost = await storage.createPost(postData);
      res.status(201).json(newPost);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // Update a post
  app.put("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);

      // Check if post exists
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check if the authenticated user is the author of the post
      if (post.userId !== req.user!.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this post" });
      }

      // Validate the request body
      const updateData = req.body;

      // Update the post
      const updatedPost = await storage.updatePost(postId, updateData);
      res.json(updatedPost);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a post
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);

      // Check if post exists
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check if the authenticated user is the author of the post
      if (post.userId !== req.user!.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this post" });
      }

      // Delete the post
      await storage.deletePost(postId);
      res.status(200).json({ message: "Post deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Comment routes
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPost(
        parseInt(req.params.postId),
      );
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
        memberCount: members.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/circles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const circleData = insertCircleSchema.parse({
        ...req.body,
        creatorId: req.user!.id, // Use authenticated user's ID
      });
      const newCircle = await storage.createCircle(circleData);
      
      // Automatically add the creator as a member
      await storage.createCircleMember({
        circleId: newCircle.id,
        userId: req.user!.id,
        role: "owner"
      });
      
      res.status(201).json(newCircle);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  app.get("/api/users/:userId/circles", async (req, res) => {
    try {
      const userCircles = await storage.getCirclesByUser(
        parseInt(req.params.userId),
      );
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
        parseInt(req.params.userId),
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
      const savedRestaurants = await storage.getSavedRestaurantsByUser(
        parseInt(req.params.userId),
      );
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
            stories: [],
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

  // User Story 1: Lists API Endpoints
  // POST /api/lists → create list
  app.post("/api/lists", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const listData = insertRestaurantListSchema.parse({
        ...req.body,
        createdById: req.user!.id, // Use authenticated user's ID
      });
      const newList = await storage.createRestaurantList(listData);
      res.status(201).json(newList);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // GET /api/lists/:listId → fetch list metadata + items
  app.get("/api/lists/:listId", async (req, res) => {
    try {
      const listId = parseInt(req.params.listId);
      const list = await storage.getRestaurantList(listId);
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      // Get list items with restaurant details
      const listItems = await storage.getDetailedRestaurantsInList(list.id);

      // Remove password from user objects for security
      const cleanedListItems = listItems.map((item: any) => {
        if (item.addedBy) {
          const { password, ...cleanUser } = item.addedBy;
          return { ...item, addedBy: cleanUser };
        }
        return item;
      });

      const response = {
        ...list,
        items: cleanedListItems,
      };

      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/lists/:listId → update list (name, desc, visibility)
  app.put("/api/lists/:listId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const listId = parseInt(req.params.listId);
      const list = await storage.getRestaurantList(listId);
      
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      // Check if user owns the list
      if (list.createdById !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to edit this list" });
      }

      const updates = req.body;
      const updatedList = await storage.updateRestaurantList(listId, updates);
      res.json(updatedList);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // DELETE /api/lists/:listId → delete list
  app.delete("/api/lists/:listId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const listId = parseInt(req.params.listId);
      const list = await storage.getRestaurantList(listId);
      
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      // Check if user owns the list
      if (list.createdById !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to delete this list" });
      }

      // Delete the list (this should cascade to delete items)
      await storage.deleteRestaurantList(listId);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/lists/:listId/items → add item
  app.post("/api/lists/:listId/items", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const listId = parseInt(req.params.listId);
      const list = await storage.getRestaurantList(listId);
      
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      const itemData = insertRestaurantListItemSchema.parse({
        ...req.body,
        listId,
        addedById: req.user!.id,
      });
      
      const newItem = await storage.addRestaurantToList(itemData);
      res.status(201).json(newItem);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // DELETE /api/lists/:listId/items/:itemId → remove item
  app.delete("/api/lists/:listId/items/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const listId = parseInt(req.params.listId);
      const itemId = parseInt(req.params.itemId);
      
      // Check if list exists
      const list = await storage.getRestaurantList(listId);
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      // For now, allow list owner to delete any item
      // TODO: Check if user owns the item or the list
      if (list.createdById !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to delete items from this list" });
      }

      await storage.removeRestaurantListItem(itemId);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/lists/:listId/items/:itemId → update item metadata
  app.put("/api/lists/:listId/items/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const listId = parseInt(req.params.listId);
      const itemId = parseInt(req.params.itemId);
      
      // Check if list exists
      const list = await storage.getRestaurantList(listId);
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      // For now, allow list owner to edit any item
      // TODO: Check if user owns the item or the list
      if (list.createdById !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to edit items in this list" });
      }

      const updates = req.body;
      const updatedItem = await storage.updateRestaurantListItem(itemId, updates);
      res.json(updatedItem);
    } catch (err: any) {
      handleZodError(err, res);
    }
  });

  // Restaurant List routes (existing routes kept for backward compatibility)
  app.get("/api/restaurant-lists", async (req, res) => {
    try {
      const circleId = req.query.circleId;
      const userId = req.query.userId;
      const publicOnly = req.query.publicOnly === "true";

      if (circleId && typeof circleId === "string") {
        const lists = await storage.getRestaurantListsByCircle(
          parseInt(circleId),
        );
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
      const cleanedListItems = await Promise.all(
        listItems.map(async (item) => {
          // Clean the addedBy user object if it exists
          if (item.addedBy && item.addedBy.password) {
            const { password, ...cleanAddedBy } = item.addedBy;
            return { ...item, addedBy: cleanAddedBy };
          }
          return item;
        }),
      );

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
        restaurants: cleanedListItems,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/restaurant-lists", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const listData = insertRestaurantListSchema.parse({
        ...req.body,
        createdById: req.user!.id, // Use authenticated user's ID
      });
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

  app.delete(
    "/api/restaurant-lists/:listId/restaurants/:restaurantId",
    async (req, res) => {
      try {
        await storage.removeRestaurantFromList(
          parseInt(req.params.listId),
          parseInt(req.params.restaurantId),
        );
        res.status(204).end();
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Enhanced list management routes
  app.patch("/api/restaurant-lists/:id", async (req, res) => {
    try {
      const updates = req.body;
      const updatedList = await storage.updateRestaurantList(
        parseInt(req.params.id),
        updates,
      );
      res.json(updatedList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/restaurant-lists/:id/view", async (req, res) => {
    try {
      const updatedList = await storage.incrementListViewCount(
        parseInt(req.params.id),
      );
      res.json({ viewCount: updatedList.viewCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/restaurant-lists/:id/save", async (req, res) => {
    try {
      const updatedList = await storage.incrementListSaveCount(
        parseInt(req.params.id),
      );
      res.json({ saveCount: updatedList.saveCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Location-based discovery routes
  app.get("/api/restaurants/location/:location", async (req, res) => {
    try {
      const restaurants = await storage.getRestaurantsByLocation(
        req.params.location,
      );
      res.json(restaurants);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurants/nearby", async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;

      if (
        !lat ||
        !lng ||
        !radius ||
        typeof lat !== "string" ||
        typeof lng !== "string" ||
        typeof radius !== "string"
      ) {
        return res.status(400).json({ error: "Missing or invalid parameters" });
      }

      const restaurants = await storage.getNearbyRestaurants(
        lat,
        lng,
        parseInt(radius),
      );

      res.json(restaurants);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurant-lists/location/:location", async (req, res) => {
    try {
      // Find restaurant lists that include restaurants in this location
      const restaurants = await storage.getRestaurantsByLocation(
        req.params.location,
      );
      const restaurantIds = restaurants.map((r) => r.id);

      // Since we don't have a direct method, we'll return public lists for now
      const lists = await storage.getPublicRestaurantLists();
      res.json(lists);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurant-lists/popular/:location", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      // For now, just return the most viewed public lists
      const allLists = await storage.getPublicRestaurantLists();
      const sortedLists = allLists
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, limit);

      res.json(sortedLists);
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
        return res
          .status(401)
          .json({ error: "You must be logged in to share lists" });
      }

      // Check if list and circle exist
      const list = await storage.getRestaurantList(listId);
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      const circle = await storage.getCircle(circleId);
      if (!circle) {
        return res.status(404).json({ error: "Circle not found" });
      }

      // Check if user has permission to share the list
      if (list.createdById !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You don't have permission to share this list" });
      }

      // Share the list with the circle
      const sharedList = await storage.shareListWithCircle(listId, circleId, req.user!.id, permissions);
      
      res.status(201).json({
        message: "List shared successfully",
        sharedList
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/circles/:circleId/shared-lists", async (req, res) => {
    try {
      const circleId = parseInt(req.params.circleId);

      // Check if circle exists
      const circle = await storage.getCircle(circleId);
      if (!circle) {
        return res.status(404).json({ error: "Circle not found" });
      }

      // Get all lists shared with this circle
      const sharedLists = await storage.getListsSharedWithCircle(circleId);
      res.status(200).json(sharedLists);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/restaurant-lists/:listId/shared-with", async (req, res) => {
    try {
      const listId = parseInt(req.params.listId);

      // Check if list exists
      const list = await storage.getRestaurantList(listId);
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      // Get all circles this list is shared with
      const circlesSharedWith = await storage.getCirclesListIsSharedWith(listId);
      res.status(200).json(circlesSharedWith);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete(
    "/api/restaurant-lists/:listId/shared-with/:circleId",
    async (req, res) => {
      try {
        const listId = parseInt(req.params.listId);
        const circleId = parseInt(req.params.circleId);

        // Ensure user is authenticated
        if (!req.isAuthenticated()) {
          return res
            .status(401)
            .json({ error: "You must be logged in to unshare lists" });
        }

        // Check if the list and circle exist
        const list = await storage.getRestaurantList(listId);
        if (!list) {
          return res.status(404).json({ error: "List not found" });
        }

        const circle = await storage.getCircle(circleId);
        if (!circle) {
          return res.status(404).json({ error: "Circle not found" });
        }

        // Allow unsharing if user created the list
        const isListCreator = list.createdById === req.user.id;

        if (!isListCreator) {
          return res
            .status(403)
            .json({ error: "You don't have permission to unshare this list" });
        }

        // Unshare the list from the circle
        await storage.unshareListFromCircle(listId, circleId);
        
        res.status(200).json({
          message: "List successfully unshared from circle"
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Get featured circles
  app.get("/api/circles/featured", async (req, res) => {
    try {
      const featuredCircles = await storage.getFeaturedCircles();
      res.json(featuredCircles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Join a circle
  app.post("/api/circles/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res
        .status(401)
        .json({ error: "You must be logged in to join a circle" });
    }

    try {
      const circleId = parseInt(req.params.id);
      const userId = req.user.id;

      // Check if circle exists
      const circle = await storage.getCircle(circleId);
      if (!circle) {
        return res.status(404).json({ error: "Circle not found" });
      }

      // Check if user is already a member
      const isAlreadyMember = await storage.isUserMemberOfCircle(
        userId,
        circleId,
      );
      if (isAlreadyMember) {
        return res
          .status(400)
          .json({ error: "You are already a member of this circle" });
      }

      // Add user to circle
      await storage.createCircleMember({
        userId,
        circleId,
      });

      res.json({ message: "Successfully joined circle", circle });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("Received message:", data);

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: data.type,
                payload: data.payload,
              }),
            );
          }
        });
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  return httpServer;
}
  // Recommendations endpoints temporarily removed due to schema issues
