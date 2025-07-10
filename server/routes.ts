import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
// import { WebSocketServer, WebSocket } from "ws";
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
import { Router } from "express";
import { z } from "zod";
import { db } from "./db.js";
import { authenticate } from "./auth.js";
import recommendationsRouter from "./routes/recommendations.js";
import listsRouter from "./routes/lists.js";
import searchRouter from "./routes/search.ts";
import searchAnalyticsRouter from "./routes/search-analytics.js";
import followRoutes from './routes/follow';
import listItemCommentsRouter from './routes/list-item-comments.js';
import * as circleRoutes from './routes/circles';
import * as userRoutes from './routes/users';
// import restaurantsRouter from './routes/restaurants.js';
import { eq, desc, and, count, sql, or, like, ilike, asc, inArray } from 'drizzle-orm';
import { userFollowers, posts, restaurants, users } from "@shared/schema";
import { getPlaceDetails } from './services/google-places';

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

  // Restaurant detail endpoint moved to restaurant router

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

  // Mount the search router
  app.use('/api/search', searchRouter);

  // Restaurant search is now handled by dedicated search router at /api/search

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

  // GET /feed - get paginated feed posts for authenticated user
  app.get('/api/feed', authenticate, async (req, res) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get users that current user follows
      const followingUsers = await db
        .select({ id: userFollowers.followingId })
        .from(userFollowers)
        .where(eq(userFollowers.followerId, userId));

      const followingUserIds = followingUsers.map(u => u.id);

      const feedPosts = await db
        .select({
          id: posts.id,
          userId: posts.userId,
          restaurantId: posts.restaurantId,
          content: posts.content,
          rating: posts.rating,
          visibility: posts.visibility,
          dishesTried: posts.dishesTried,
          images: posts.images,
          priceAssessment: posts.priceAssessment,
          atmosphere: posts.atmosphere,
          serviceRating: posts.serviceRating,
          dietaryOptions: posts.dietaryOptions,
          createdAt: posts.createdAt,
          restaurant: {
            id: restaurants.id,
            name: restaurants.name,
            location: restaurants.location,
            category: restaurants.category,
            priceRange: restaurants.priceRange,
            openTableId: restaurants.openTableId,
            resyId: restaurants.resyId,
            googlePlaceId: restaurants.googlePlaceId,
            address: restaurants.address,
            neighborhood: restaurants.neighborhood,
            city: restaurants.city,
            state: restaurants.state,
            country: restaurants.country,
            postalCode: restaurants.postalCode,
            latitude: restaurants.latitude,
            longitude: restaurants.longitude,
            phone: restaurants.phone,
            website: restaurants.website,
            cuisine: restaurants.cuisine,
            hours: restaurants.hours,
            description: restaurants.description,
            imageUrl: restaurants.imageUrl,
            verified: restaurants.verified,
            createdAt: restaurants.createdAt,
            updatedAt: restaurants.updatedAt,
          },
          author: {
            id: users.id,
            username: users.username,
            name: users.name,
            bio: users.bio,
            profilePicture: users.profilePicture,
            preferredCuisines: users.preferredCuisines,
            preferredPriceRange: users.preferredPriceRange,
            preferredLocation: users.preferredLocation,
            diningInterests: users.diningInterests,
          },
        })
        .from(posts)
        .innerJoin(restaurants, eq(posts.restaurantId, restaurants.id))
        .innerJoin(users, eq(posts.userId, users.id))
        .where(
          and(
            eq(posts.visibility, 'public'),
            // Include posts from users you follow OR your own posts
            or(
              inArray(posts.userId, [...followingUserIds, userId]),
              eq(posts.userId, userId)
            )
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

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

  // User Story 5: Content Moderation endpoints
  app.post("/api/reports", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const reportData = {
        ...req.body,
        reporterId: req.user!.id,
      };

      // Validate required fields
      if (!reportData.contentType || !reportData.contentId || !reportData.reason) {
        return res.status(400).json({ error: "Missing required fields: contentType, contentId, reason" });
      }

      // Validate content type
      const validContentTypes = ['post', 'comment', 'list', 'user'];
      if (!validContentTypes.includes(reportData.contentType)) {
        return res.status(400).json({ error: "Invalid content type" });
      }

      // Validate reason
      const validReasons = ['spam', 'inappropriate', 'harassment', 'false_info', 'other'];
      if (!validReasons.includes(reportData.reason)) {
        return res.status(400).json({ error: "Invalid reason" });
      }

      const newReport = await storage.createContentReport(reportData);
      res.status(201).json(newReport);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { status, contentType, limit } = req.query;
      const options: any = {};

      if (status && typeof status === 'string') {
        options.status = status;
      }
      if (contentType && typeof contentType === 'string') {
        options.contentType = contentType;
      }
      if (limit && typeof limit === 'string') {
        const parsedLimit = parseInt(limit);
        if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
          options.limit = parsedLimit;
        }
      }

      const reports = await storage.getContentReports(options);
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/content/:contentType/:contentId/reports", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { contentType, contentId } = req.params;
      const parsedContentId = parseInt(contentId);

      if (isNaN(parsedContentId)) {
        return res.status(400).json({ error: "Invalid content ID" });
      }

      const reports = await storage.getReportsByContent(contentType, parsedContentId);
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/reports/:reportId/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const reportId = parseInt(req.params.reportId);
      const { status, resolution } = req.body;

      if (isNaN(reportId)) {
        return res.status(400).json({ error: "Invalid report ID" });
      }

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const validStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updatedReport = await storage.updateContentReportStatus(
        reportId, 
        status, 
        req.user!.id, 
        resolution
      );

      res.json(updatedReport);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User Story 4: Top Picks endpoint
  app.get("/api/top-picks", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const category = req.query.category as string || 'all'; // 'restaurants', 'posts', or 'all'

      if (isNaN(limit) || limit < 1 || limit > 50) {
        return res.status(400).json({ error: "Invalid limit parameter" });
      }

      let topPicks: any = {};

      if (category === 'restaurants' || category === 'all') {
        // Get top-rated restaurants based on average post ratings
        const topRestaurants = await storage.getPopularContent();
        const restaurantPicks = topRestaurants
          .filter(item => item.type === 'restaurant')
          .slice(0, Math.floor(limit / 2))
          .map(item => ({
            id: item.id,
            name: item.name,
            location: item.location,
            category: item.category,
            averageRating: item.averageRating,
            totalPosts: item.postCount,
            imageUrl: item.imageUrl,
            type: 'restaurant'
          }));

        topPicks.restaurants = restaurantPicks;
      }

      if (category === 'posts' || category === 'all') {
        // Get most liked and commented posts
        const topPosts = await storage.getPopularContent();
        const postPicks = topPosts
          .filter(item => item.type === 'post')
          .slice(0, Math.floor(limit / 2))
          .map(item => ({
            id: item.id,
            content: item.content,
            rating: item.rating,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            author: {
              id: item.authorId,
              name: item.authorName,
              username: item.authorUsername
            },
            restaurant: {
              id: item.restaurantId,
              name: item.restaurantName,
              location: item.restaurantLocation
            },
            createdAt: item.createdAt,
            type: 'post'
          }));

        topPicks.posts = postPicks;
      }

      res.json({
        category,
        limit,
        data: topPicks,
        timestamp: new Date().toISOString()
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
      const { listIds, ...postDataRaw } = req.body;
      const postData = insertPostSchema.parse(postDataRaw);

      // Use createPostWithLists if listIds are provided
      const newPost = await storage.createPostWithLists(postData, listIds);
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

  // Like routes - User Story 8: Comments & Likes on Dining Posts
  app.post("/api/posts/:postId/likes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.postId);
      const userId = req.user!.id;

      // Check if user already liked this post
      const existingLike = await storage.isPostLikedByUser(postId, userId);
      if (existingLike) {
        return res.status(400).json({ error: "Post already liked" });
      }

      const newLike = await storage.createLike({ postId, userId });
      res.status(201).json(newLike);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Remove like from post
  app.delete("/api/posts/:postId/likes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.postId);
      const userId = req.user!.id;

      await storage.deleteLike(postId, userId);
      res.status(200).json({ message: "Like removed successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Restaurant detail endpoint removed - now handled by restaurant router

  // Circle endpoints (inline for compatibility)
  app.get("/api/circles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const allCircles = await storage.getAllCircles();
      res.json(allCircles);
    } catch (error) {
      console.error('Error fetching circles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/me/circles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const userCircles = await storage.getCirclesByUser(userId);
      res.json(userCircles);
    } catch (error) {
      console.error('Error fetching user circles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/circles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const { name, description, primaryCuisine, priceRange, location, allowPublicJoin } = req.body;

      // Create circle
      const newCircle = await storage.createCircle({
        name,
        description,
        creatorId: userId,
        primaryCuisine: primaryCuisine || null,
        priceRange: priceRange || null,
        location: location || null,
        allowPublicJoin: allowPublicJoin || false
      });

      // Add creator as owner
      await storage.createCircleMember({
        circleId: newCircle.id,
        userId: userId,
        role: 'owner',
        joinedAt: new Date()
      });

      res.status(201).json(newCircle);
    } catch (error) {
      console.error('Error creating circle:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Circle-List Integration endpoints
  app.post("/api/circles/:circleId/lists", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const circleId = parseInt(req.params.circleId);
      const { listId, canEdit, canReshare } = req.body;
      const userId = req.user!.id;

      // Check if user is member of circle
      const isMember = await storage.isUserMemberOfCircle(userId, circleId);
      if (!isMember) {
        return res.status(403).json({ error: 'Only circle members can share lists' });
      }

      // Share list with circle
      const sharedList = await storage.shareListWithCircle(listId, circleId, userId, {
        canEdit: canEdit || false,
        canReshare: canReshare || false
      });

      res.status(201).json(sharedList);
    } catch (error) {
      console.error('Error sharing list with circle:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/circles/:circleId/lists", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const circleId = parseInt(req.params.circleId);
      const userId = req.user!.id;

      // Check if user is member of circle
      const isMember = await storage.isUserMemberOfCircle(userId, circleId);
      if (!isMember) {
        return res.status(403).json({ error: 'Only circle members can view shared lists' });
      }

      // Get lists shared with circle
      const sharedLists = await storage.getListsSharedWithCircle(circleId);
      res.json(sharedLists);
    } catch (error) {
      console.error('Error fetching circle shared lists:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete("/api/circles/:circleId/lists/:listId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const circleId = parseInt(req.params.circleId);
      const listId = parseInt(req.params.listId);
      const userId = req.user!.id;

      // Check if user is member of circle
      const isMember = await storage.isUserMemberOfCircle(userId, circleId);
      if (!isMember) {
        return res.status(403).json({ error: 'Only circle members can unshare lists' });
      }

      // Unshare list from circle
      await storage.unshareListFromCircle(listId, circleId);
      res.status(200).json({ message: 'List unshared successfully' });
    } catch (error) {
      console.error('Error unsharing list from circle:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Mount routers
  app.use("/api/search", searchRouter);
  
  // Mount restaurant router
  const restaurantRouter = await import("./routes/restaurants");
  app.use("/api/restaurants", restaurantRouter.default);
  
  // app.use("/api/lists", listsRouter);
  // app.use("/api/recommendations", recommendationsRouter);
  // app.use("/api/list-item-comments", listItemCommentsRouter);
  // app.use("/api/follow", followRoutes);
  // app.use("/api/search-analytics", searchAnalyticsRouter);
  // app.use("/api/circles", circleRoutes.router); // Commented out to use inline endpoints
  // app.use("/api/users", userRoutes.router);

  // Health check route
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server temporarily disabled to fix login issues
  // Will be re-enabled after login is working properly

  return httpServer;
}