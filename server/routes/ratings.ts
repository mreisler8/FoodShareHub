import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { ratings, insertRatingSchema, restaurants, circles, circleMembers } from '../../shared/schema';
import { eq, and, desc, asc, inArray, sql, gte, or } from 'drizzle-orm';
import { onNewRating } from '../lib/circleScoreJobs';
import { ratingsRateLimit } from '../middleware/rateLimiter';
import { resolveRestaurantId } from '../services/restaurantIdentity';
import { features } from '../config/features';

const router = Router();

// Validation schemas  
const createRatingSchema = insertRatingSchema.omit({ userId: true, restaurantName: true }).extend({
  ratingValue: z.union([z.number(), z.string()]).transform((val) => parseFloat(val.toString())).refine((val) => val >= 0.1 && val <= 10.0, "Rating must be between 0.1 and 10.0"),
  note: z.string().max(140).optional(),
  tags: z.array(z.string()).max(5).optional(),
  restaurantName: z.string().optional(), // Optional for Google Place ratings
});

const updateRatingSchema = createRatingSchema.partial().extend({
  id: z.number()
});

// GET /api/ratings - Get user's ratings with filters
router.get('/', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { restaurantId, googlePlaceId, sharedOnly, limit = 50, offset = 0 } = req.query;

    let whereConditions = [eq(ratings.userId, req.user.id)];

    if (restaurantId) {
      whereConditions.push(eq(ratings.restaurantId, parseInt(restaurantId as string)));
    }

    if (googlePlaceId) {
      whereConditions.push(eq(ratings.googlePlaceId, googlePlaceId as string));
    }

    if (sharedOnly === 'true') {
      whereConditions.push(eq(ratings.sharedWithCircle, true));
    }

    const userRatings = await db.select()
      .from(ratings)
      .where(and(...whereConditions))
      .orderBy(desc(ratings.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    res.json(userRatings);
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// PUT /api/ratings - Create or update rating (with strict identity binding)
router.put('/', ratingsRateLimit, async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userId = req.user!.id;
    const { restaurantId, googlePlaceId, restaurantName, ratingValue, note, tags, circleIds, isPrivate } = req.body;

    // Validate required fields
    if (!ratingValue || ratingValue < 0.1 || ratingValue > 10.0) {
      return res.status(400).json({ error: 'Rating value must be between 0.1 and 10.0' });
    }

    if (!restaurantId && !googlePlaceId) {
      return res.status(400).json({ error: 'Either restaurant ID or Google Place ID is required' });
    }

    // PHASE 1: Identity Resolution - get canonical restaurant ID and place ID
    const resolved = await resolveRestaurantId({
      restaurantId: restaurantId ? parseInt(restaurantId) : undefined,
      placeId: googlePlaceId,
    });

    console.log(`RATINGS_WRITE resolved identity:`, resolved);

    if (!resolved || !resolved.restaurantId) {
      return res.status(400).json({ error: 'Could not resolve restaurant identity' });
    }

    const canonicalRestaurantId = resolved.restaurantId;
    const canonicalPlaceId = resolved.placeId;

    // PHASE 1 FIX: Check for existing ratings by BOTH restaurant ID AND place ID to prevent duplicates
    const existingRatings = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.userId, userId),
        or(
          eq(ratings.restaurantId, canonicalRestaurantId),
          eq(ratings.googlePlaceId, canonicalPlaceId || '')
        )
      ));

    const existingRating = existingRatings[0] || null;
    
    console.log('DUPLICATE_CHECK:', { 
      canonicalRestaurantId, 
      canonicalPlaceId, 
      existingRatings: existingRatings.length,
      existing: existingRating?.id || 'none'
    });

    // ABUSE PREVENTION: Duplicate rating check (24-hour cooldown for new ratings)
    const rateLimitEnabled = process.env.FEATURE_RATING_LIMITS === 'true';
    if (rateLimitEnabled && existingRating) {
      const lastUpdate = new Date(existingRating.updatedAt || existingRating.createdAt);
      const now = new Date();
      const hoursSinceLastRating = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastRating < 24) {
        return res.status(429).json({
          error: "You've already rated this restaurant today. You can update your rating tomorrow.",
          type: 'duplicate_rating',
          retryAfter: Math.ceil((24 - hoursSinceLastRating) * 3600)
        });
      }
    }

    let result;
    if (existingRating) {
      // PHASE 1 FIX: Update existing rating AND fix contaminated restaurant name
      // Get the correct restaurant name from our database (fixes contamination)
      const dbRestaurant = await db.select({ name: restaurants.name })
        .from(restaurants)
        .where(eq(restaurants.id, canonicalRestaurantId))
        .limit(1);

      const correctRestaurantName = dbRestaurant[0]?.name || restaurantName;

      console.log('CONTAMINATION_FIX:', { 
        ratingId: existingRating.id, 
        oldName: existingRating.restaurantName,
        newName: correctRestaurantName
      });

      [result] = await db
        .update(ratings)
        .set({
          restaurantId: canonicalRestaurantId, // Ensure canonical restaurant ID
          restaurantName: correctRestaurantName, // FIX CONTAMINATION HERE
          ratingValue: ratingValue.toString(),
          note: note || null,
          tags: tags || [],
          circleIds: circleIds || [],
          isPrivate: isPrivate || false,
          updatedAt: new Date()
        })
        .where(eq(ratings.id, existingRating.id))
        .returning();
    } else {
      // PHASE 1 FIX: Create new rating with canonical identity binding  
      // Get the correct restaurant name from our database (prevents contamination)
      const dbRestaurant = await db.select({ name: restaurants.name })
        .from(restaurants)
        .where(eq(restaurants.id, canonicalRestaurantId))
        .limit(1);

      const correctRestaurantName = dbRestaurant[0]?.name || restaurantName;
      
      [result] = await db
        .insert(ratings)
        .values({
          userId,
          restaurantId: canonicalRestaurantId,
          googlePlaceId: canonicalPlaceId || null,
          restaurantName: correctRestaurantName, // Use canonical name to prevent contamination
          ratingValue: ratingValue.toString(),
          note: note || null,
          tags: tags || [],
          circleIds: circleIds || [],
          isPrivate: isPrivate || false,
        })
        .returning();
    }

    // CRITICAL FIX: Invalidate Circle Score cache immediately after rating update
    console.log('CIRCLE_SCORE_INVALIDATED:', { restaurantId: canonicalRestaurantId, userId });
    
    // Clear cache for this specific restaurant
    const { delCache } = await import('../services/cache');
    await delCache(`circleScore:${canonicalRestaurantId}`);
    
    res.json(result);
  } catch (error) {
    console.error('Error creating/updating rating:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// GET /api/ratings/restaurant/:id - Get user's rating for specific restaurant  
router.get('/restaurant/:id', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { id } = req.params;
    const type = req.query.type as string; // 'google_place' or 'database'
    console.log('Rating API - Fetching rating for ID:', id, 'User:', req.user.id, 'Type:', type);

    let rating;
    let expectedRestaurantId: number | null = null;
    let expectedGooglePlaceId: string | null = null;

    if (type === 'google_place' || (!type && (id.startsWith('ChIJ') || id.length > 10))) {
      // Handle Google Place ID
      const cleanId = id.replace('google_', ''); // Remove google_ prefix if present
      expectedGooglePlaceId = cleanId;
      console.log('Clean Google Place ID:', cleanId);
      rating = await db.select().from(ratings)
        .where(and(
          eq(ratings.userId, req.user.id),
          eq(ratings.googlePlaceId, cleanId)
        ))
        .limit(1);
    } else if (type === 'database' || (!type && !isNaN(parseInt(id)))) {
      // Handle numeric restaurant ID
      const numericId = parseInt(id);
      expectedRestaurantId = numericId;
      console.log('Parsing numeric ID:', id, 'Result:', numericId);
      if (isNaN(numericId)) {
        console.error('Invalid restaurant ID format:', id);
        return res.status(400).json({ error: 'Invalid restaurant ID format' });
      }
      rating = await db.select().from(ratings)
        .where(and(
          eq(ratings.userId, req.user.id),
          eq(ratings.restaurantId, numericId)
        ))
        .limit(1);
    } else {
      return res.status(400).json({ error: 'Invalid restaurant identifier' });
    }

    console.log('Rating query result:', rating);

    if (rating.length === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const ratingData = rating[0];
    
    // CRITICAL FIX: Data integrity validation
    // Verify rating matches the requested restaurant to prevent data mismatches
    const isValidMatch = (
      (expectedRestaurantId && ratingData.restaurantId === expectedRestaurantId) ||
      (expectedGooglePlaceId && ratingData.googlePlaceId === expectedGooglePlaceId)
    );

    if (!isValidMatch) {
      console.error('🚨 DATA INTEGRITY ERROR: Rating mismatch detected', {
        expectedRestaurantId,
        expectedGooglePlaceId,
        actualRestaurantId: ratingData.restaurantId,
        actualGooglePlaceId: ratingData.googlePlaceId,
        ratingId: ratingData.id
      });
      return res.status(404).json({ 
        error: 'Rating not found',
        details: 'Data integrity check failed'
      });
    }

    // Return rating with verified IDs for frontend validation
    res.json({
      ...ratingData,
      verifiedRestaurantId: expectedRestaurantId,
      verifiedGooglePlaceId: expectedGooglePlaceId
    });
  } catch (error) {
    console.error('Get restaurant rating error:', error);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

// POST /api/ratings - Create or update rating
router.post('/', ratingsRateLimit, async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    console.log('Create/Update rating request:', req.body);
    const validatedData = createRatingSchema.parse(req.body);
    console.log('Validated rating data:', validatedData);

    // Validate circle access if sharing with circles
    if (validatedData.sharedWithCircle && validatedData.circleIds?.length) {
      const userCircles = await db.select()
        .from(circleMembers)
        .where(eq(circleMembers.userId, req.user.id));

      const userCircleIds = userCircles.map(cm => cm.circleId);
      const invalidCircles = validatedData.circleIds.filter(cId => !userCircleIds.includes(cId));

      if (invalidCircles.length > 0) {
        return res.status(403).json({ 
          error: 'Cannot share to circles you are not a member of' 
        });
      }
    }

    const ratingData = {
      ...validatedData,
      ratingValue: validatedData.ratingValue.toString(),
      userId: req.user.id,
      updatedAt: new Date(),
    };

    // Check if rating already exists (upsert logic)
    let existingRating;
    if (validatedData.restaurantId) {
      existingRating = await db.select().from(ratings)
        .where(and(
          eq(ratings.userId, req.user.id),
          eq(ratings.restaurantId, validatedData.restaurantId)
        ))
        .limit(1);
    } else if (validatedData.googlePlaceId) {
      existingRating = await db.select().from(ratings)
        .where(and(
          eq(ratings.userId, req.user.id),
          eq(ratings.googlePlaceId, validatedData.googlePlaceId)
        ))
        .limit(1);
    }

    let rating;
    if (existingRating && existingRating.length > 0) {
      // Update existing rating
      console.log('Updating existing rating:', existingRating[0].id);
      rating = await db.update(ratings)
        .set(ratingData)
        .where(eq(ratings.id, existingRating[0].id))
        .returning();
    } else {
      // Create new rating
      console.log('Creating new rating');
      rating = await db.insert(ratings)
        .values(ratingData)
        .returning();
    }

    // Trigger circle score calculation
    if (rating && rating.length > 0) {
        await onNewRating(rating[0].restaurantId, rating[0].googlePlaceId);
    }

    res.status(201).json(rating[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    console.error('Create rating error:', error);
    res.status(500).json({ error: 'Failed to create rating' });
  }
});

// PUT /api/ratings/:id - Update existing rating
router.put('/:id', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ratingId = parseInt(req.params.id);
    const validatedData = updateRatingSchema.parse({ ...req.body, id: ratingId });

    // Verify ownership
    const existingRating = await db.select().from(ratings)
      .where(and(
        eq(ratings.id, ratingId),
        eq(ratings.userId, req.user.id)
      ))
      .limit(1);

    if (existingRating.length === 0) {
      return res.status(404).json({ error: 'Rating not found or access denied' });
    }

    // Validate circle access if updating circle sharing
    if (validatedData.sharedWithCircle && validatedData.circleIds?.length) {
      const userCircles = await db.select()
        .from(circleMembers)
        .where(eq(circleMembers.userId, req.user.id));

      const userCircleIds = userCircles.map(cm => cm.circleId);
      const invalidCircles = validatedData.circleIds.filter(cId => !userCircleIds.includes(cId));

      if (invalidCircles.length > 0) {
        return res.status(403).json({ 
          error: 'Cannot share to circles you are not a member of' 
        });
      }
    }

    const updateData = {
      ...validatedData,
      ratingValue: validatedData.ratingValue ? validatedData.ratingValue.toString() : undefined,
      updatedAt: new Date(),
    };
    const { id, ...updateDataWithoutId } = updateData; // Remove id from update data

    const updatedRating = await db.update(ratings)
      .set(updateDataWithoutId)
      .where(eq(ratings.id, ratingId))
      .returning();

    res.json(updatedRating[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    console.error('Update rating error:', error);
    res.status(500).json({ error: 'Failed to update rating' });
  }
});

// DELETE /api/ratings/:id - Delete rating
router.delete('/:id', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ratingId = parseInt(req.params.id);

    // Verify ownership
    const existingRating = await db.select().from(ratings)
      .where(and(
        eq(ratings.id, ratingId),
        eq(ratings.userId, req.user.id)
      ))
      .limit(1);

    if (existingRating.length === 0) {
      return res.status(404).json({ error: 'Rating not found or access denied' });
    }

    await db.delete(ratings).where(eq(ratings.id, ratingId));

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

// GET /api/ratings/circle/:circleId - Get ratings shared with specific circle
router.get('/circle/:circleId', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const circleId = parseInt(req.params.circleId);

    // Verify circle membership
    const membership = await db.select().from(circleMembers)
      .where(and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, req.user.id),
        eq(circleMembers.status, 'active')
      ))
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied to this circle' });
    }

    // Get ratings shared with this circle
    const circleRatings = await db.select()
      .from(ratings)
      .where(and(
        eq(ratings.sharedWithCircle, true),
        sql`${ratings.circleIds} @> ARRAY[${circleId}]`
      ))
      .orderBy(desc(ratings.createdAt));

    res.json(circleRatings);
  } catch (error) {
    console.error('Get circle ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch circle ratings' });
  }
});

export default router;