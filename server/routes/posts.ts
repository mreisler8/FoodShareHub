import { Router } from 'express';
import { authenticate } from '../auth';
import { insertPostSchema, posts, restaurants, users } from '@shared/schema';
import { db } from '../db';
import { eq, desc, and, sql, or } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Create a new post
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const validatedData = insertPostSchema.parse({
      ...req.body,
      userId,
    });

    // Handle restaurant creation/retrieval for Google Places restaurants
    let restaurantId = validatedData.restaurantId;

    if (typeof restaurantId === 'string' && restaurantId.startsWith('google_')) {
      // Extract Google Place ID and create restaurant record
      const googlePlaceId = restaurantId.replace('google_', '');
      const metadata = validatedData.metadata as any;

      // Check if restaurant already exists
      const existingRestaurant = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.googlePlaceId, googlePlaceId))
        .limit(1);

      if (existingRestaurant.length > 0) {
        restaurantId = existingRestaurant[0].id;
      } else {
        // Create new restaurant record
        const newRestaurant = await db
          .insert(restaurants)
          .values({
            name: metadata?.restaurantName || 'Unknown Restaurant',
            location: metadata?.restaurantLocation || 'Unknown Location',
            category: 'restaurant',
            priceRange: '$',
            googlePlaceId,
            address: metadata?.restaurantLocation || '',
            city: metadata?.restaurantLocation || '',
            cuisine: 'Various',
          })
          .returning();

        restaurantId = newRestaurant[0].id;
      }
    }

    // Create the post
    const newPost = await db
      .insert(posts)
      .values({
        ...validatedData,
        restaurantId: Number(restaurantId),
        userId,
      })
      .returning();

    // Fetch the complete post with restaurant and user details
    const postWithDetails = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        visibility: posts.visibility,
        dishesTried: posts.dishesTried,
        images: posts.images,
        videos: posts.videos,
        imageTags: posts.imageTags,
        tags: posts.tags,
        priceAssessment: posts.priceAssessment,
        atmosphere: posts.atmosphere,
        serviceRating: posts.serviceRating,
        dietaryOptions: posts.dietaryOptions,
        postType: posts.postType,
        metadata: posts.metadata,
        createdAt: posts.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          category: restaurants.category,
          imageUrl: restaurants.imageUrl,
        },
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        },
      })
      .from(posts)
      .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, newPost[0].id))
      .limit(1);

    res.status(201).json(postWithDetails[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid post data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create post' });
    }
  }
});

// Get posts for feed (paginated)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const feedPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        visibility: posts.visibility,
        dishesTried: posts.dishesTried,
        images: posts.images,
        videos: posts.videos,
        imageTags: posts.imageTags,
        tags: posts.tags,
        priceAssessment: posts.priceAssessment,
        atmosphere: posts.atmosphere,
        serviceRating: posts.serviceRating,
        dietaryOptions: posts.dietaryOptions,
        postType: posts.postType,
        metadata: posts.metadata,
        createdAt: posts.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          category: restaurants.category,
          imageUrl: restaurants.imageUrl,
        },
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        },
      })
      .from(posts)
      .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(feedPosts);
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get a specific post
router.get('/:id', authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const post = await db
      .select({
        id: posts.id,
        content: posts.content,
        rating: posts.rating,
        visibility: posts.visibility,
        dishesTried: posts.dishesTried,
        images: posts.images,
        videos: posts.videos,
        imageTags: posts.imageTags,
        tags: posts.tags,
        priceAssessment: posts.priceAssessment,
        atmosphere: posts.atmosphere,
        serviceRating: posts.serviceRating,
        dietaryOptions: posts.dietaryOptions,
        postType: posts.postType,
        metadata: posts.metadata,
        createdAt: posts.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          category: restaurants.category,
          imageUrl: restaurants.imageUrl,
        },
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          profilePicture: users.profilePicture,
        },
      })
      .from(posts)
      .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, postId))
      .limit(1);

    if (post.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Update a post
router.put('/:id', authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Check if user owns the post
    const existingPost = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .limit(1);

    if (existingPost.length === 0) {
      return res.status(404).json({ error: 'Post not found or access denied' });
    }

    // Validate update data
    const updateData = insertPostSchema.partial().parse(req.body);

    // Update the post
    const updatedPost = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, postId))
      .returning();

    res.json(updatedPost[0]);
  } catch (error) {
    console.error('Error updating post:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid post data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update post' });
    }
  }
});

// Delete a post
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Check if user owns the post
    const existingPost = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .limit(1);

    if (existingPost.length === 0) {
      return res.status(404).json({ error: 'Post not found or access denied' });
    }

    // Delete the post
    await db.delete(posts).where(eq(posts.id, postId));

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;