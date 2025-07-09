
import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { authenticate } from '../auth.js';
import { recommendations, circleMembers } from '../../shared/schema';
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

    // Single optimized query to check membership and get recommendations
    const result = await db.execute(sql`
      WITH membership_check AS (
        SELECT 1 as is_member
        FROM circle_members cm
        WHERE cm.circle_id = ${circleId} AND cm.user_id = ${userId}
        LIMIT 1
      ),
      enriched_recommendations AS (
        SELECT 
          r.id, r.circle_id as "circleId", r.restaurant_id as "restaurantId",
          r.user_id as "userId", r.created_at as "createdAt",
          res.name as "restaurantName", res.cuisine, res.price_range as "priceRange",
          res.location, res.image_url as "imageUrl", res.address,
          u.name as "userName", u.username, u.profile_picture as "profilePicture"
        FROM recommendations r
        INNER JOIN restaurants res ON r.restaurant_id = res.id
        INNER JOIN users u ON r.user_id = u.id
        WHERE r.circle_id = ${circleId}
        ORDER BY r.created_at DESC
      )
      SELECT 
        (SELECT is_member FROM membership_check) as "hasMembership",
        json_agg(
          json_build_object(
            'id', er.id,
            'circleId', er."circleId",
            'restaurantId', er."restaurantId", 
            'userId', er."userId",
            'createdAt', er."createdAt",
            'restaurant', json_build_object(
              'name', er."restaurantName",
              'cuisine', er.cuisine,
              'priceRange', er."priceRange",
              'location', er.location,
              'imageUrl', er."imageUrl",
              'address', er.address
            ),
            'user', json_build_object(
              'name', er."userName",
              'username', er.username,
              'profilePicture', er."profilePicture"
            )
          )
        ) as recommendations
      FROM enriched_recommendations er
    `);

    const data = result.rows?.[0];
    if (!data?.hasMembership) {
      return res.status(403).json({ 
        error: 'You must be a member of this circle to view recommendations',
        code: 'ACCESS_DENIED'
      });
    }

    res.json(data.recommendations || []);
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

    // Check if user is member of this circle
    const [membership] = await db
      .select()
      .from(circleMembers)
      .where(and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, userId)
      ))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ 
        error: 'You must be a member of this circle to add recommendations' 
      });
    }

    // Check if recommendation already exists (prevent duplicates)
    const [existingRec] = await db
      .select()
      .from(recommendations)
      .where(and(
        eq(recommendations.circleId, circleId),
        eq(recommendations.restaurantId, restaurantId),
        eq(recommendations.userId, userId)
      ))
      .limit(1);

    if (existingRec) {
      return res.status(409).json({ 
        error: 'You have already recommended this restaurant to this circle' 
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
        details: error.errors.map(e => e.message)
      });
    }

    console.error('Error creating recommendation:', error);
    res.status(500).json({ 
      error: 'Failed to create recommendation. Please try again.' 
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
