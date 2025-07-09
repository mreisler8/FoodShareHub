
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
    
    // Validate the circle ID is a valid number
    if (isNaN(circleId) || circleId <= 0) {
      return res.status(400).json({ 
        error: 'Invalid circle ID - must be a positive number' 
      });
    }

    // Check if user is member of this circle (security check)
    const [membership] = await db
      .select()
      .from(circleMembers)
      .where(and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, req.user!.id)
      ))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ 
        error: 'You must be a member of this circle to view recommendations' 
      });
    }

    // Get recommendations with better query structure
    const recs = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.circleId, circleId))
      .orderBy(recommendations.createdAt); // Show newest first

    res.json(recs);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recommendations. Please try again.' 
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
