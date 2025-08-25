import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, asc, sql, inArray, ne } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { restaurantLists, restaurantListItems, restaurants, circleMembers, circleSharedLists, savedLists, sharedLists, postListItems } from '../../shared/schema';

const router = Router();

// Simplified schema that matches frontend payload
const createListSchema = z.object({
  name: z.string().min(1, 'List name is required'),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  circleId: z.number().nullable().optional(),
  visibility: z.enum(['public', 'circle', 'private']).optional().default('public'),
  isPublic: z.boolean().optional().default(false),
  shareWithCircle: z.boolean().optional().default(false),
  makePublic: z.boolean().optional().default(false),
});

// POST /api/lists - Create a new list
router.post("/", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    console.log('Creating list for user:', userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Validate request body using schema
    const validatedData = createListSchema.parse(req.body);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));

    const { 
      name, 
      description, 
      tags,
      circleId, 
      visibility,
      isPublic,
      shareWithCircle, 
      makePublic 
    } = validatedData;

    // Basic validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        error: "List name is required",
        code: "VALIDATION_ERROR"
      });
    }

    // Check for duplicate name before creating
    const existingLists = await db
      .select()
      .from(restaurantLists)
      .where(and(
        eq(restaurantLists.name, name),
        eq(restaurantLists.createdById, userId)
      ))
      .limit(1);

    if (existingLists.length > 0) {
      return res.status(409).json({
        error: 'duplicate_list',
        existingId: existingLists[0].id
      });
    }

    // Determine final visibility
    const finalVisibility = makePublic ? 'public' : (shareWithCircle ? 'circle' : 'private');

    const newList = await db.insert(restaurantLists).values({
      name: name.trim(),
      description: description?.trim() || null,
      createdById: userId,
      type: "restaurant",
      audience: "profile",
      visibility: finalVisibility,
      circleId: circleId || null,
      shareWithCircle: shareWithCircle || false,
      makePublic: makePublic || false,
      allowSharing: true,
      isPublic: makePublic || false,
      tags: tags || [],
    }).returning();

    console.log('Created list:', newList[0]);

    // If sharing to circle, create shared list relationship
    if (circleId && shareWithCircle && newList[0]) {
      await db.insert(circleSharedLists).values({
        circleId: circleId,
        listId: newList[0].id,
        sharedById: userId,
        canEdit: false,
        canReshare: false,
      });
    }

    res.status(201).json(newList[0]);
  } catch (error) {
    console.error('Error creating list:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors,
        code: "VALIDATION_ERROR"
      });
    }
    res.status(500).json({ error: 'Failed to create list' });
  }
});

export default router;