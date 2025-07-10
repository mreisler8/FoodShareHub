
import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { authenticate } from '../auth.js';
import { recommendations, circleMembers, restaurants, users } from '../../shared/schema';
import { z } from 'zod';

const router = Router();

// Input validation schemas - these check that data is in the right format
const createRecommendationSchema = z.object({
  circleId: z.number().positive('Circle ID must be a positive number'),
  restaurantId: z.number().positive('Restaurant ID must be a positive number')
});

// GET all recommendations for a circle
router.get('/:circleId', authenticate, async (req, res) => {
  try {
    const circleId = parseInt(req.params.circleId);
    const userId = req.user!.id;
    
    // Validate the circle ID is a valid number
    if (isNaN(circleId) || circleId <= 0 || circleId > 2147483647) {
      return res.status(400).json({ 
        error: 'Invalid circle ID - must be a positive integer',
        code: 'INVALID_CIRCLE_ID'
      });
    }

    // First, check if user is a member of the circle (more efficient single query)
    const membershipCheck = await db
      .select({ isMember: sql<boolean>`true` })
      .from(circleMembers)
      .where(and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, userId)
      ))
      .limit(1);

    // If user is not a member, deny access immediately
    if (membershipCheck.length === 0) {
      return res.status(403).json({ 
        error: 'You must be a member of this circle to view recommendations',
        code: 'ACCESS_DENIED'
      });
    }

    // Get recommendations with restaurant and user data in one optimized query
    const recommendationsWithDetails = await db
      .select({
        // Recommendation fields
        id: recommendations.id,
        circleId: recommendations.circleId,
        restaurantId: recommendations.restaurantId,
        userId: recommendations.userId,
        createdAt: recommendations.createdAt,
        // Restaurant details (only essential fields)
        restaurantName: restaurants.name,
        cuisine: restaurants.cuisine,
        priceRange: restaurants.priceRange,
        location: restaurants.location,
        imageUrl: restaurants.imageUrl,
        address: restaurants.address,
        // User details (only essential fields)
        userName: users.name,
        username: users.username,
        profilePicture: users.profilePicture,
      })
      .from(recommendations)
      .innerJoin(restaurants, eq(recommendations.restaurantId, restaurants.id))
      .innerJoin(users, eq(recommendations.userId, users.id))
      .where(eq(recommendations.circleId, circleId))
      .orderBy(sql`${recommendations.createdAt} DESC`)
      .limit(50); // Add reasonable limit to prevent large result sets

    // Transform the flat results into the expected nested structure
    const formattedRecommendations = recommendationsWithDetails.map(rec => ({
      id: rec.id,
      circleId: rec.circleId,
      restaurantId: rec.restaurantId,
      userId: rec.userId,
      createdAt: rec.createdAt,
      restaurant: {
        name: rec.restaurantName,
        cuisine: rec.cuisine,
        priceRange: rec.priceRange,
        location: rec.location,
        imageUrl: rec.imageUrl,
        address: rec.address,
      },
      user: {
        name: rec.userName,
        username: rec.username,
        profilePicture: rec.profilePicture,
      },
    }));

    res.json(formattedRecommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recommendations. Please try again.',
      code: 'FETCH_ERROR'
    });
  }
});

// POST a new recommendation
router.post('/', authenticate, async (req, res) => {
  try {
    // Validate input data using our schema
    const validatedData = createRecommendationSchema.parse(req.body);
    const { circleId, restaurantId } = validatedData;
    const userId = req.user!.id;

    // Single query to check membership and existing recommendation
    const [membershipAndExisting] = await db
      .select({
        isMember: sql<boolean>`EXISTS(
          SELECT 1 FROM ${circleMembers} cm 
          WHERE cm.circle_id = ${circleId} AND cm.user_id = ${userId}
        )`,
        hasExistingRec: sql<boolean>`EXISTS(
          SELECT 1 FROM ${recommendations} r 
          WHERE r.circle_id = ${circleId} 
          AND r.restaurant_id = ${restaurantId} 
          AND r.user_id = ${userId}
        )`,
        restaurantExists: sql<boolean>`EXISTS(
          SELECT 1 FROM ${restaurants} res 
          WHERE res.id = ${restaurantId}
        )`
      })
      .from(sql`(SELECT 1) as dummy`);

    // Check if user is member of this circle
    if (!membershipAndExisting.isMember) {
      return res.status(403).json({ 
        error: 'You must be a member of this circle to add recommendations',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if restaurant exists
    if (!membershipAndExisting.restaurantExists) {
      return res.status(404).json({ 
        error: 'Restaurant not found',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // Check if recommendation already exists (prevent duplicates)
    if (membershipAndExisting.hasExistingRec) {
      return res.status(409).json({ 
        error: 'You have already recommended this restaurant to this circle',
        code: 'DUPLICATE_RECOMMENDATION'
      });
    }

    // Create the recommendation
    const [newRecommendation] = await db
      .insert(recommendations)
      .values({ circleId, restaurantId, userId })
      .returning();

    res.status(201).json(newRecommendation);
  } catch (error) {
    // Handle validation errors specifically
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    console.error('Error creating recommendation:', error);
    res.status(500).json({ 
      error: 'Failed to create recommendation. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
});

// DELETE your own recommendation
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const recId = parseInt(req.params.id);
    
    // Validate the recommendation ID
    if (isNaN(recId) || recId <= 0) {
      return res.status(400).json({ 
        error: 'Invalid recommendation ID' 
      });
    }

    // Check if recommendation exists and belongs to user
    const [existingRec] = await db
      .select()
      .from(recommendations)
      .where(and(
        eq(recommendations.id, recId),
        eq(recommendations.userId, req.user!.id)
      ))
      .limit(1);

    if (!existingRec) {
      return res.status(404).json({ 
        error: 'Recommendation not found or you do not have permission to delete it' 
      });
    }

    // Delete the recommendation
    await db
      .delete(recommendations)
      .where(eq(recommendations.id, recId));

    res.status(204).send(); // 204 means "successfully deleted, no content to return"
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    res.status(500).json({ 
      error: 'Failed to delete recommendation. Please try again.' 
    });
  }
});

export default router;
