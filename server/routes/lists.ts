import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, asc, sql, inArray, ne } from 'drizzle-orm';
import { db } from '../db';
import { authenticate } from '../auth';
import { restaurantLists, restaurantListItems, restaurants, circleMembers, circleSharedLists, savedLists, sharedLists, postListItems, insertRestaurantListSchemaV2, insertRestaurantListSchema, userFollowers } from '../../shared/schema';
import { tempSavedListStorage } from '../temp-storage';
import { isFeatureEnabled } from '../feature-flags';
import { deriveVisibility, normalizeVisibilityInput, shouldUseV2Writes, canAccessList, type DerivedVisibility } from '../lib/visibility-shim';

const router = Router();

// V2 Schema (new visibility system)
// Schema for restaurant list items in V2
const restaurantListItemSchemaV2 = z.object({
  restaurantId: z.number().nullable().optional(),
  position: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  restaurant: z.object({
    id: z.number().optional(),
    name: z.string(),
    location: z.string().optional(),
    city: z.string().optional(),
    // Add other restaurant fields as needed
  }).optional(),
});

const createListSchemaV2 = z.object({
  name: z.string().min(1, 'List name is required').max(100, 'List name must be 100 characters or less'),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  circleId: z.number().nullable().optional(),
  visibilityV2: z.enum(['private', 'public', 'followers', 'circle']).default('private'),
  visibilityCircleIds: z.array(z.number()).nullable().optional(),
  type: z.enum(['restaurant', 'dish']).optional().default('restaurant'),
  coverImage: z.string().nullable().optional(),
  primaryLocation: z.string().nullable().optional(),
  // CRITICAL: Add items field to preserve restaurant data through validation
  items: z.array(restaurantListItemSchemaV2).optional().default([]),
}).refine((data) => {
  // If visibility is 'circle', require at least one circle ID
  if (data.visibilityV2 === 'circle' && (!data.visibilityCircleIds || data.visibilityCircleIds.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Circle visibility requires at least one circle ID",
  path: ["visibilityCircleIds"],
});

// Legacy schema for backward compatibility
const createListSchema = z.object({
  name: z.string().min(1, 'List name is required'),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  circleId: z.number().nullable().optional(),
  visibility: z.enum(['public', 'circle', 'followers', 'private']).optional().default('private'),
  isPublic: z.boolean().optional().default(false),
  shareWithCircle: z.boolean().optional().default(false),
  makePublic: z.boolean().optional().default(false),
});

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  visibility: z.enum(['public', 'circle', 'private', 'followers']).optional(),
  shareWithCircle: z.boolean().optional(),
  makePublic: z.boolean().optional(),

});

const addItemSchema = z.object({
  restaurantId: z.number(),
  position: z.number().nullable().optional(),
  rating: z.number().min(1).max(10).nullable().optional(),
  priceAssessment: z.enum(['Great value', 'Fair', 'Overpriced']).nullable().optional(),
  liked: z.union([z.string(), z.null()]).optional(),
  disliked: z.union([z.string(), z.null()]).optional(),
  notes: z.string().nullable().optional(),
  mustTryDishes: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]), // Frontend sends this
});

const reorderItemsSchema = z.object({
  itemIds: z.array(z.number()).min(1, 'At least one item ID is required'),
});

const updateItemSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  priceAssessment: z.enum(['Great value', 'Fair', 'Overpriced']).optional(),
  liked: z.string().optional(),
  disliked: z.string().optional(),
  notes: z.string().optional(),
  mustTryDishes: z.array(z.string()).optional(),
});

// GET /api/lists - Get user's lists with filtering and name search
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const filter = req.query.filter as string;
    const name = req.query.name as string;

    // Handle duplicate name checking
    if (name) {
      try {
        const lists = await db
          .select()
          .from(restaurantLists)
          .where(and(
            eq(restaurantLists.name, name),
            eq(restaurantLists.createdById, userId)
          ));
        return res.json(lists);
      } catch (dbError) {
        console.error('Database error checking duplicate name, using temp storage:', dbError);
        // Fallback to temp storage for duplicate checking
        const allLists = await tempSavedListStorage.getRestaurantListsByUser(userId);
        const duplicates = allLists.filter(list => list.name === name);
        return res.json(duplicates);
      }
    }

    try {
      if (filter === 'mine') {
        // More efficient approach: use database joins instead of multiple queries
        // This gets all lists the user can access in one optimized query

        try {
          // Validate user ID
          if (!userId || typeof userId !== 'number') {
            return res.status(401).json({ error: 'Invalid user authentication' });
          }

          // Use proper ORM queries with both legacy and V2 fields
          const ownLists = await db
            .select({
              id: restaurantLists.id,
              name: restaurantLists.name,
              description: restaurantLists.description,
              createdById: restaurantLists.createdById,
              circleId: restaurantLists.circleId,
              isPublic: restaurantLists.isPublic,
              visibility: restaurantLists.visibility,
              shareWithCircle: restaurantLists.shareWithCircle,
              makePublic: restaurantLists.makePublic,
              visibility_v2: restaurantLists.visibilityV2,
              visibility_circle_ids: restaurantLists.visibilityCircleIds,
              createdAt: restaurantLists.createdAt,
              updatedAt: restaurantLists.updatedAt,
              tags: restaurantLists.tags,
              primaryLocation: restaurantLists.primaryLocation
            })
            .from(restaurantLists)
            .where(eq(restaurantLists.createdById, userId))
            .orderBy(restaurantLists.createdAt);

          const publicLists = await db
            .select({
              id: restaurantLists.id,
              name: restaurantLists.name,
              description: restaurantLists.description,
              createdById: restaurantLists.createdById,
              circleId: restaurantLists.circleId,
              isPublic: restaurantLists.isPublic,
              visibility: restaurantLists.visibility,
              shareWithCircle: restaurantLists.shareWithCircle,
              makePublic: restaurantLists.makePublic,
              visibility_v2: restaurantLists.visibilityV2,
              visibility_circle_ids: restaurantLists.visibilityCircleIds,
              createdAt: restaurantLists.createdAt,
              updatedAt: restaurantLists.updatedAt,
              tags: restaurantLists.tags,
              primaryLocation: restaurantLists.primaryLocation
            })
            .from(restaurantLists)
            .where(
              and(
                eq(restaurantLists.makePublic, true),
                ne(restaurantLists.createdById, userId)
              )
            )
            .orderBy(restaurantLists.createdAt);

          const circleSharedLists = await db
            .select({
              id: restaurantLists.id,
              name: restaurantLists.name,
              description: restaurantLists.description,
              createdById: restaurantLists.createdById,
              circleId: restaurantLists.circleId,
              isPublic: restaurantLists.isPublic,
              visibility: restaurantLists.visibility,
              shareWithCircle: restaurantLists.shareWithCircle,
              makePublic: restaurantLists.makePublic,
              visibility_v2: restaurantLists.visibilityV2,
              visibility_circle_ids: restaurantLists.visibilityCircleIds,
              createdAt: restaurantLists.createdAt,
              updatedAt: restaurantLists.updatedAt,
              tags: restaurantLists.tags,
              primaryLocation: restaurantLists.primaryLocation
            })
            .from(restaurantLists)
            .innerJoin(circleMembers, eq(restaurantLists.circleId, circleMembers.circleId))
            .where(
              and(
                eq(restaurantLists.shareWithCircle, true),
                eq(circleMembers.userId, userId),
                ne(restaurantLists.createdById, userId),
                eq(restaurantLists.makePublic, false)
              )
            )
            .orderBy(restaurantLists.createdAt);

          // Combine results and normalize visibility
          const allLists = [...ownLists, ...publicLists, ...circleSharedLists].map(list => ({
            ...list,
            derivedVisibility: deriveVisibility(list)
          }));

          console.log('[MINE FILTER API] Found lists for restaurant count calc:', allLists.map(l => l.id));

          // Get restaurant counts for each list - CRITICAL FIX (was missing!)
          const listIds = allLists.map(list => list.id);
          let listsWithCounts = allLists;

          if (listIds.length > 0) {
            const restaurantCounts = await db
              .select({
                listId: restaurantListItems.listId,
                count: sql<number>`count(*)::int`
              })
              .from(restaurantListItems)
              .where(inArray(restaurantListItems.listId, listIds))
              .groupBy(restaurantListItems.listId);

            console.log('[MINE FILTER API] Restaurant counts result:', restaurantCounts);

            const countByList: Record<number, number> = {};
            restaurantCounts.forEach(({ listId, count }) => {
              countByList[listId] = count;
              console.log(`[MINE FILTER API] List ${listId} has ${count} restaurants`);
            });

            listsWithCounts = allLists.map(list => ({
              ...list,
              restaurantCount: countByList[list.id] || 0
            }));
          }

          res.json(listsWithCounts);
        } catch (dbError) {
          console.error('Database error fetching accessible lists, using temp storage:', dbError);
          // Fallback to temp storage
          const lists = await tempSavedListStorage.getRestaurantListsByUser(userId);
          res.json(lists);
        }
      } else {
        // Default: return user's own lists with circle sharing information
        const lists = await db
          .select()
          .from(restaurantLists)
          .where(eq(restaurantLists.createdById, userId));

        // Get circle shared information for all lists
        const listIds = lists.map(list => list.id);

        if (listIds.length > 0) {
          const sharedInfo = await db
            .select({
              listId: circleSharedLists.listId,
              circleId: circleSharedLists.circleId
            })
            .from(circleSharedLists)
            .where(inArray(circleSharedLists.listId, listIds));

          // Group shared circles by list ID
          const sharedCirclesByList: Record<number, number[]> = {};
          sharedInfo.forEach(share => {
            if (!sharedCirclesByList[share.listId]) {
              sharedCirclesByList[share.listId] = [];
            }
            sharedCirclesByList[share.listId].push(share.circleId);
          });

          // Get restaurant counts for all lists - FIXED (Main Lists API)
          console.log('[MAIN LISTS API] Fetching restaurant counts for list IDs:', listIds);
          const restaurantCounts = await db
            .select({
              listId: restaurantListItems.listId,
              count: sql<number>`count(*)::int`
            })
            .from(restaurantListItems)
            .where(inArray(restaurantListItems.listId, listIds))
            .groupBy(restaurantListItems.listId);

          console.log('[MAIN LISTS API] Restaurant counts query result:', restaurantCounts);

          const countByList: Record<number, number> = {};
          restaurantCounts.forEach(({ listId, count }) => {
            countByList[listId] = count;
            console.log(`[MAIN LISTS API] List ${listId} has ${count} restaurants`);
          });

          // Add shared circles and restaurant count to each list - FIXED
          const listsWithSharing = lists.map(list => ({
            ...list,
            sharedWithCircles: sharedCirclesByList[list.id] || [],
            restaurantCount: countByList[list.id] || 0
          }));

          console.log('[DEFAULT LISTS API] Final response with counts:', listsWithSharing.map(l => `${l.id}:${l.restaurantCount}`));

          res.json(listsWithSharing);
        } else {
          res.json(lists);
        }
      }
    } catch (dbError) {
      console.error('Database error, using temp storage:', dbError);
      // Fallback to temp storage
      const lists = await tempSavedListStorage.getRestaurantListsByUser(userId);
      res.json(lists);
    }
  } catch (error) {
    console.error('Error fetching lists:', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// POST /api/lists - Create a new list
router.post("/", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    console.log('Creating list for user:', userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Use V2 schema if visibilityV2 is present, otherwise legacy
    const useV2Schema = req.body.visibilityV2 !== undefined;
    const schema = useV2Schema ? createListSchemaV2 : createListSchema;
    
    console.log('Using schema:', useV2Schema ? 'V2' : 'Legacy');
    console.log('Has items in request body:', !!(req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0));
    const validatedData = schema.parse(req.body);
    console.log('Validated data keys:', Object.keys(validatedData));
    console.log('Items in validated data:', (validatedData as any).items?.length || 0);

    // Extract fields based on schema version
    let name: string;
    let description: string | null | undefined;
    let tags: string[] = [];
    let circleId: number | null = null;
    let visibility: string | undefined;
    let isPublic: boolean | undefined;
    let shareWithCircle: boolean | undefined;
    let makePublic: boolean | undefined;
    let visibilityV2: string | undefined;
    let visibilityCircleIds: number[] | null = null;

    if (useV2Schema) {
      const v2Data = validatedData as z.infer<typeof createListSchemaV2>;
      name = v2Data.name;
      description = v2Data.description;
      tags = v2Data.tags || [];
      visibilityV2 = v2Data.visibilityV2;
      visibilityCircleIds = v2Data.visibilityCircleIds || null;
      
      // Convert V2 to legacy format for compatibility
      switch (v2Data.visibilityV2) {
        case 'public':
          makePublic = true;
          isPublic = true;
          visibility = 'public';
          break;
        case 'circle':
          shareWithCircle = true;
          visibility = 'circle';
          circleId = (v2Data.visibilityCircleIds && v2Data.visibilityCircleIds.length > 0) ? v2Data.visibilityCircleIds[0] : null;
          break;
        case 'followers':
          visibility = 'followers';
          break;
        default:
          visibility = 'private';
      }
    } else {
      const legacyData = validatedData as z.infer<typeof createListSchema>;
      name = legacyData.name;
      description = legacyData.description;
      tags = legacyData.tags || [];
      circleId = legacyData.circleId;
      visibility = legacyData.visibility;
      isPublic = legacyData.isPublic;
      shareWithCircle = legacyData.shareWithCircle;
      makePublic = legacyData.makePublic;
    }

    // Enterprise validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        error: "List name is required",
        code: "VALIDATION_ERROR"
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        error: "List name must be 100 characters or less",
        code: "VALIDATION_ERROR"
      });
    }

    // Validate circle permissions if sharing to circle
    if (circleId && shareWithCircle) {
      const circleAccess = await db
        .select()
        .from(circleMembers)
        .where(
          and(
            eq(circleMembers.circleId, circleId),
            eq(circleMembers.userId, userId),
            eq(circleMembers.status, "active")
          )
        )
        .limit(1);

      if (circleAccess.length === 0) {
        return res.status(403).json({
          error: "You don't have permission to share to this circle",
          code: "PERMISSION_DENIED"
        });
      }
    }

    try {
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

      // Normalize visibility input using the shim
      const derivedVisibility = normalizeVisibilityInput({
        makePublic: makePublic || false,
        shareWithCircle: shareWithCircle || false,
        circleId: circleId || undefined,
        visibility: visibility || 'private'
      });

      // Prepare data for both legacy and V2 fields
      const listData = {
        name: name.trim(),
        description: description?.trim() || null,
        createdById: userId,
        type: "restaurant" as const,
        audience: "profile" as const,
        // Legacy fields (always populated for backward compatibility)
        visibility: String(derivedVisibility.type) || 'private',
        circleId: derivedVisibility.type === 'circle' ? (derivedVisibility.circleIds?.[0] || null) : null,
        shareWithCircle: derivedVisibility.type === 'circle',
        makePublic: derivedVisibility.type === 'public',
        isPublic: derivedVisibility.type === 'public',
        allowSharing: true,
        tags: tags || [],
        // V2 fields (when feature enabled)
        ...(shouldUseV2Writes() && {
          visibilityV2: derivedVisibility.type,
          visibilityCircleIds: derivedVisibility.circleIds
        })
      };

      const newList = await db.insert(restaurantLists).values(listData).returning();

      // Handle list items if provided
      if (useV2Schema && (validatedData as any).items && Array.isArray((validatedData as any).items)) {
        const items = (validatedData as any).items;
        console.log(`Adding ${items.length} items to new list ${newList[0].id}`);
        
        for (const item of items) {
          console.log('Processing item:', JSON.stringify(item, null, 2));
          
          let restaurantId = item.restaurantId;
          
          // If no restaurantId but we have restaurant data, try to create/find the restaurant first
          if (!restaurantId && item.restaurant) {
            console.log('Creating/finding restaurant for item:', item.restaurant);
            try {
              // Try to find existing restaurant by name and location
              const existingRestaurant = await db
                .select()
                .from(restaurants)
                .where(eq(restaurants.name, item.restaurant.name))
                .limit(1);
              
              if (existingRestaurant.length > 0) {
                restaurantId = existingRestaurant[0].id;
                console.log(`Found existing restaurant ID: ${restaurantId}`);
              } else {
                // Create new restaurant
                const newRestaurant = await db.insert(restaurants).values({
                  name: item.restaurant.name,
                  location: item.restaurant.location || item.restaurant.city || 'Unknown',
                  category: 'Restaurant', // Required field
                  priceRange: '$', // Required field - default value
                  cuisineType: null,
                  rating: null,
                  description: null,
                  imageUrl: null,
                  websiteUrl: null,
                  phoneNumber: null,
                  hours: null,
                  priceLevel: null,
                  googlePlaceId: null,
                  googleRating: null,
                  googleRatingCount: null,
                  address: null,
                  city: item.restaurant.city || null,
                  state: null,
                  zipCode: null,
                  country: null,
                  latitude: null,
                  longitude: null,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }).returning();
                
                restaurantId = newRestaurant[0].id;
                console.log(`Created new restaurant ID: ${restaurantId}`);
              }
            } catch (restaurantError) {
              console.error('Failed to create/find restaurant:', restaurantError);
            }
          }
          
          if (restaurantId) {
            try {
              await db.insert(restaurantListItems).values({
                listId: newList[0].id,
                restaurantId: restaurantId,
                position: item.position || null,
                notes: item.notes || null,
                addedById: userId,
                addedAt: new Date(),
                rating: null,
                priceAssessment: null,
                liked: null,
                disliked: null,
                mustTryDishes: null
              });
              console.log(`Successfully added restaurant ${restaurantId} to list ${newList[0].id}`);
            } catch (itemError) {
              console.error(`Failed to add item ${restaurantId} to list:`, itemError);
              // Continue with other items instead of failing completely
            }
          } else {
            console.warn('Skipping item - no valid restaurant ID found');
          }
        }
      }

      // If sharing to circle, create shared list relationship
      if (circleId && shareWithCircle && newList[0]) {
        await db.insert(circleSharedLists).values({
          circleId: circleId,
          listId: newList[0].id,
          sharedById: userId,
          canEdit: false,
          canReshare: false,
        });

        // Update circle activity (for enterprise analytics)
        console.log(`List "${name}" shared to circle ${circleId} by user ${userId}`);
      }

      console.log('Created list:', newList[0]);

      res.status(201).json(newList[0]);
    } catch (dbError) {
      console.error('Database error creating list:', dbError);
      res.status(500).json({ error: 'Failed to create list' });
    }
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

// Save/unsave a list
router.post("/:id/save", authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Check if already saved
    const existing = await db
      .select()
      .from(savedLists)
      .where(
        and(
          eq(savedLists.listId, listId),
          eq(savedLists.userId, userId)
        )
      );

    if (existing.length > 0) {
      return res.status(400).json({ error: "List already saved" });
    }

    // Save the list
    await db.insert(savedLists).values({
      listId,
      userId,
    });

    res.json({ success: true, message: "List saved successfully" });
  } catch (error) {
    console.error("Error saving list:", error);
    res.status(500).json({ error: "Failed to save list" });
  }
});

router.delete("/:id/save", authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    await db
      .delete(savedLists)
      .where(
        and(
          eq(savedLists.listId, listId),
          eq(savedLists.userId, userId)
        )
      );

    res.json({ success: true, message: "List removed from saved" });
  } catch (error) {
    console.error("Error removing saved list:", error);
    res.status(500).json({ error: "Failed to remove saved list" });
  }
});

// POST /:id/restaurants - Add restaurant to existing list (SYSTEMIC FIX)
router.post("/:id/restaurants", authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { name, location, googlePlaceId, notes, position } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Restaurant name is required" });
    }

    // Verify list exists and user has access
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check if user can add to this list (owner or shared with edit permission)
    if (list.createdById !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create or find restaurant
    let restaurantId: number;

    if (googlePlaceId) {
      // Try to find existing restaurant by Google Place ID
      const [existingRestaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.googlePlaceId, googlePlaceId));

      if (existingRestaurant) {
        restaurantId = existingRestaurant.id;
      } else {
        // Create new restaurant with Google Place ID
        const [newRestaurant] = await db
          .insert(restaurants)
          .values({
            name,
            location: location || 'Unknown location',
            googlePlaceId,
            category: 'Restaurant',
            priceRange: '$$',
            cuisine: 'General',
          })
          .returning();
        restaurantId = newRestaurant.id;
      }
    } else {
      // Create restaurant without Google Place ID
      const [newRestaurant] = await db
        .insert(restaurants)
        .values({
          name,
          location: location || 'Unknown location',
          category: 'Restaurant',
          priceRange: '$$',
          cuisine: 'General',
        })
        .returning();
      restaurantId = newRestaurant.id;
    }

    // Get next position if not provided
    let finalPosition = position || 0;
    if (finalPosition === 0) {
      const maxPosition = await db
        .select({ max: sql<number>`MAX(${restaurantListItems.position})` })
        .from(restaurantListItems)
        .where(eq(restaurantListItems.listId, listId));

      finalPosition = (maxPosition[0]?.max || 0) + 1;
    }

    // Add restaurant to list (using only fields that exist in current database)
    const [listItem] = await db
      .insert(restaurantListItems)
      .values({
        listId,
        restaurantId,
        notes: notes || null,
        position: finalPosition,
        addedById: userId,
      })
      .returning();

    res.json({ 
      success: true, 
      item: listItem,
      message: `${name} added to list successfully`
    });

  } catch (error) {
    console.error("Error adding restaurant to list:", error);
    res.status(500).json({ error: "Failed to add restaurant to list" });
  }
});

// GET /api/lists/:id - Get specific list with items (with filtering and sorting)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Parse query parameters for filtering and sorting
    const { sort, 'filter[cuisine]': cuisineFilter, 'filter[city]': cityFilter } = req.query;

    // Get list metadata
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Access control: Allow access if:
    // 1. User owns the list
    // 2. List is public (makePublic = true)
    // 3. List is shared with circle and user is member of that circle
    const isOwner = list.createdById === userId;
    const isPublic = list.makePublic === true;

    let hasCircleAccess = false;
    if (list.shareWithCircle && list.circleId) {
      // Check if user is member of the associated circle
      const [circleMember] = await db
        .select()
        .from(circleMembers)
        .where(and(
          eq(circleMembers.circleId, list.circleId),
          eq(circleMembers.userId, userId)
        ));
      hasCircleAccess = !!circleMember;
    }

    if (!isOwner && !isPublic && !hasCircleAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query conditions for filtering
    let queryConditions = [eq(restaurantListItems.listId, listId)];

    if (cuisineFilter) {
      queryConditions.push(eq(restaurants.cuisine, cuisineFilter as string));
    }

    if (cityFilter) {
      queryConditions.push(eq(restaurants.city, cityFilter as string));
    }

    // Optimize with a single efficient query including all needed data
    const sortColumn = sort === 'rating' ? 'rli.rating DESC NULLS LAST' :
                      sort === 'rating_asc' ? 'rli.rating ASC NULLS LAST' :
                      'rli.position ASC';

    const cuisineCondition = cuisineFilter ? sql`AND r.cuisine = ${cuisineFilter}` : sql``;
    const cityCondition = cityFilter ? sql`AND r.city = ${cityFilter}` : sql``;

    const itemsResult = await db.execute(sql`
      SELECT 
        rli.id, rli.list_id as "listId", rli.restaurant_id as "restaurantId",
        rli.rating, rli.price_assessment as "priceAssessment", rli.liked, 
        rli.disliked, rli.notes, rli.must_try_dishes as "mustTryDishes",
        rli.added_by_id as "addedById", rli.position, rli.added_at as "addedAt",
        r.id as "restaurant.id", r.name as "restaurant.name", 
        r.location as "restaurant.location", r.category as "restaurant.category",
        r.price_range as "restaurant.priceRange", r.address as "restaurant.address",
        r.cuisine as "restaurant.cuisine", r.city as "restaurant.city",
        r.image_url as "restaurant.imageUrl", r.phone as "restaurant.phone"
      FROM restaurant_list_items rli
      LEFT JOIN restaurants r ON rli.restaurant_id = r.id
      WHERE rli.list_id = ${listId}
      ${cuisineCondition}
      ${cityCondition}
      ORDER BY ${sql.raw(sortColumn)}
    `);

    const items = itemsResult.rows || [];

    // Calculate aggregated stats
    const stats = {
      totalItems: items.length,
      avgRating: items.length > 0 ? items.reduce((sum: number, item: any) => sum + (item.rating || 0), 0) / items.filter((item: any) => item.rating).length : 0,
      cuisines: Array.from(new Set(items.map((item: any) => item['restaurant.cuisine']).filter(Boolean))),
      cities: Array.from(new Set(items.map((item: any) => item['restaurant.city']).filter(Boolean))),
    };

    res.json({
      ...list,
      items,
      stats
    });
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// PUT /api/lists/:id - Update list metadata
router.put('/:id', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const data = updateListSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if list exists and user owns it
    const [existingList] = await db
      .select()
      .from(restaurantLists)
      .where(and(
        eq(restaurantLists.id, listId),
        eq(restaurantLists.createdById, userId)
      ));

    if (!existingList) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    // Handle visibility logic consistently with creation
    let updateData: any = { ...data };
    if (data.shareWithCircle !== undefined || data.makePublic !== undefined) {
      const shareWithCircle = data.shareWithCircle !== undefined ? data.shareWithCircle : existingList.shareWithCircle;
      const makePublic = data.makePublic !== undefined ? data.makePublic : existingList.makePublic;

      updateData.visibility = makePublic ? 'public' : (shareWithCircle ? 'circle' : 'private');
      updateData.isPublic = makePublic;
    }

    const [updatedList] = await db
      .update(restaurantLists)
      .set(updateData)
      .where(eq(restaurantLists.id, listId))
      .returning();

    res.json(updatedList);
  } catch (error) {
    console.error('Error updating list:', error);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// DELETE /api/lists/:id - Delete a list
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Check if list exists and user owns it
    const [existingList] = await db
      .select()
      .from(restaurantLists)
      .where(and(
        eq(restaurantLists.id, listId),
        eq(restaurantLists.createdById, userId)
      ));

    if (!existingList) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    // ENTERPRISE-GRADE CASCADING DELETE
    // Delete all list items first
    await db
      .delete(restaurantListItems)
      .where(eq(restaurantListItems.listId, listId));

    // Delete all saved list references (users who saved this list)
    await db
      .delete(savedLists)
      .where(eq(savedLists.listId, listId));

    // Delete all circle shared list references (circles this list was shared with)
    await db
      .delete(circleSharedLists)
      .where(eq(circleSharedLists.listId, listId));

    // Delete all shared list references (legacy shared lists table)
    await db
      .delete(sharedLists)
      .where(eq(sharedLists.listId, listId));

    // Delete post-list associations (posts that reference this list)
    await db
      .delete(postListItems)
      .where(eq(postListItems.listId, listId));

    // Finally delete the list itself
    await db
      .delete(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// Removed duplicate route - using the more complete version below at line 1489

// PUT /api/lists/items/:itemId - Update list item
router.put('/items/:itemId', authenticate, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const data = updateItemSchema.parse(req.body);

    // Check if item exists
    const [existingItem] = await db
      .select()
      .from(restaurantListItems)
      .where(eq(restaurantListItems.id, itemId));

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const [updatedItem] = await db
      .update(restaurantListItems)
      .set(data)
      .where(eq(restaurantListItems.id, itemId))
      .returning();

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating list item:', error);
    res.status(500).json({ error: 'Failed to update list item' });
  }
});

// DELETE /api/lists/items/:itemId - Remove item from list
router.delete('/items/:itemId', authenticate, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);

    await db
      .delete(restaurantListItems)
      .where(eq(restaurantListItems.id, itemId));

    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing item from list:', error);
    res.status(500).json({ error: 'Failed to remove item from list' });
  }
});

// GET /api/lists/:id/items - Get list items with filtering and sorting
router.get('/:id/items', authenticate, async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Parse query parameters
    const { sort, 'filter[cuisine]': cuisineFilter, 'filter[city]': cityFilter } = req.query;

    // Verify access to the list
    const [list] = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, listId));

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const isOwner = list.createdById === userId;
    const isPublic = list.makePublic === true;

    let hasCircleAccess = false;
    if (list.shareWithCircle && list.circleId) {
      const [circleMember] = await db
        .select()
        .from(circleMembers)
        .where(and(
          eq(circleMembers.circleId, list.circleId),
          eq(circleMembers.userId, userId)
        ));
      hasCircleAccess = !!circleMember;
    }

    if (!isOwner && !isPublic && !hasCircleAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query conditions for filtering
    let queryConditions = [eq(restaurantListItems.listId, listId)];

    if (cuisineFilter) {
      queryConditions.push(eq(restaurants.cuisine, cuisineFilter as string));
    }

    if (cityFilter) {
      queryConditions.push(eq(restaurants.city, cityFilter as string));
    }

    // Optimize with a single efficient query including all needed data
    const sortColumn = sort === 'rating' ? 'rli.rating DESC NULLS LAST' :
                      sort === 'rating_asc' ? 'rli.rating ASC NULLS LAST' :
                      'rli.position ASC';

    const cuisineCondition = cuisineFilter ? sql`AND r.cuisine = ${cuisineFilter}` : sql``;
    const cityCondition = cityFilter ? sql`AND r.city = ${cityFilter}` : sql``;

    const itemsResult = await db.execute(sql`
      SELECT 
        rli.id, rli.list_id as "listId", rli.restaurant_id as "restaurantId",
        rli.rating, rli.price_assessment as "priceAssessment", rli.liked, 
        rli.disliked, rli.notes, rli.must_try_dishes as "mustTryDishes",
        rli.added_by_id as "addedById", rli.position, rli.added_at as "addedAt",
        r.id as "restaurant.id", r.name as "restaurant.name", 
        r.location as "restaurant.location", r.category as "restaurant.category",
        r.price_range as "restaurant.priceRange", r.address as "restaurant.address",
        r.cuisine as "restaurant.cuisine", r.city as "restaurant.city",
        r.image_url as "restaurant.imageUrl", r.phone as "restaurant.phone"
      FROM restaurant_list_items rli
      LEFT JOIN restaurants r ON rli.restaurant_id = r.id
      WHERE rli.list_id = ${listId}
      ${cuisineCondition}
      ${cityCondition}
      ORDER BY ${sql.raw(sortColumn)}
    `);

    const items = itemsResult.rows || [];

    // Calculate aggregated stats
    const stats = {
      totalItems: items.length,
      avgRating: items.length > 0 ? items.reduce((sum: number, item: any) => sum + (item.rating || 0), 0) / items.filter((item: any) => item.rating).length : 0,
      cuisines: Array.from(new Set(items.map((item: any) => item['restaurant.cuisine']).filter(Boolean))),
      cities: Array.from(new Set(items.map((item: any) => item['restaurant.city']).filter(Boolean))),
    };

    res.json({
      items,
      stats
    });
  } catch (error) {
    console.error('Error fetching list items:', error);
    res.status(500).json({ error: 'Failed to fetch list items' });
  }
});

// GET /user/:userId - Get all lists for a specific user (for my-lists page)
router.get("/user/:userId", authenticate, async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.userId);
    const currentUserId = req.user!.id;

    // Allow users to get their own lists
    if (requestedUserId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get user's lists with counts and metrics
    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        createdById: restaurantLists.createdById,
        circleId: restaurantLists.circleId,
        isPublic: restaurantLists.isPublic,
        tags: restaurantLists.tags,
        type: restaurantLists.type,
        audience: restaurantLists.audience,
        visibility: restaurantLists.visibility,
        allowSharing: restaurantLists.allowSharing,
        shareWithCircle: restaurantLists.shareWithCircle,
        makePublic: restaurantLists.makePublic,
        viewCount: restaurantLists.viewCount,
        saveCount: restaurantLists.saveCount,
        reactionCount: restaurantLists.reactionCount,
        createdAt: restaurantLists.createdAt,
        updatedAt: restaurantLists.updatedAt,
      })
      .from(restaurantLists)
      .where(eq(restaurantLists.createdById, currentUserId))
      .orderBy(desc(restaurantLists.updatedAt));

    // Get restaurant counts for each list
    const listIds = lists.map(list => list.id);
    let listsWithCounts = lists;

    if (listIds.length > 0) {
      const restaurantCounts = await db
        .select({
          listId: restaurantListItems.listId,
          count: sql<number>`count(*)::int`
        })
        .from(restaurantListItems)
        .where(inArray(restaurantListItems.listId, listIds))
        .groupBy(restaurantListItems.listId);

      const countByList: Record<number, number> = {};
      restaurantCounts.forEach(({ listId, count }) => {
        countByList[listId] = count;
      });

      listsWithCounts = lists.map(list => ({
        ...list,
        restaurantCount: countByList[list.id] || 0
      }));
    }

    res.json(listsWithCounts);
  } catch (error) {
    console.error("Error fetching user lists:", error);
    res.status(500).json({ error: "Failed to fetch user lists" });
  }
});

// POST /:id/duplicate - Duplicate a list
router.post("/:id/duplicate", authenticate, async (req, res) => {
  try {
    const originalListId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Get the original list
    const [originalList] = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.id, originalListId));

    if (!originalList) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check if user has access to view this list
    if (!originalList.isPublic && originalList.createdById !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create duplicate list
    const [duplicatedList] = await db
      .insert(restaurantLists)
      .values({
        name: `${originalList.name} (Copy)`,
        description: originalList.description,
        createdById: userId,
        circleId: null, // Reset to no circle
        isPublic: false, // Reset to private
        tags: originalList.tags,
        type: originalList.type,
        audience: 'profile', // Reset to profile
        visibility: 'private', // Reset to private
        allowSharing: originalList.allowSharing,
        shareWithCircle: false, // Reset sharing
        makePublic: false, // Reset public
      })
      .returning();

    // Copy list items
    const originalItems = await db
      .select()
      .from(restaurantListItems)
      .where(eq(restaurantListItems.listId, originalListId));

    if (originalItems.length > 0) {
      await db
        .insert(restaurantListItems)
        .values(
          originalItems.map(item => ({
            listId: duplicatedList.id,
            restaurantId: item.restaurantId,
            rating: item.rating,
            priceAssessment: item.priceAssessment,
            liked: item.liked,
            disliked: item.disliked,
            notes: item.notes,
            mustTryDishes: item.mustTryDishes,
            addedById: userId,
            position: item.position,
          }))
        );
    }

    res.json({ 
      success: true, 
      message: "List duplicated successfully",
      list: duplicatedList 
    });
  } catch (error) {
    console.error("Error duplicating list:", error);
    res.status(500).json({ error: "Failed to duplicate list" });
  }
});

// Get user's lists
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    if (!userId || isNaN(parseInt(userId.toString()))) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userIdInt = parseInt(userId.toString());

    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        createdById: restaurantLists.createdById,
        circleId: restaurantLists.circleId,
        isPublic: restaurantLists.isPublic,
        tags: restaurantLists.tags,
        visibility: restaurantLists.visibility,
        viewCount: restaurantLists.viewCount,
        saveCount: restaurantLists.saveCount,
        reactionCount: restaurantLists.reactionCount,
        createdAt: restaurantLists.createdAt,
        updatedAt: restaurantLists.updatedAt,
      })
      .from(restaurantLists)
      .where(eq(restaurantLists.createdById, userIdInt))
      .orderBy(desc(restaurantLists.updatedAt));

    // Get restaurant counts for each list
    const listIds = lists.map(list => list.id);
    let listsWithCounts = lists;

    if (listIds.length > 0) {
      const restaurantCounts = await db
        .select({
          listId: restaurantListItems.listId,
          count: sql<number>`count(*)::int`
        })
        .from(restaurantListItems)
        .where(inArray(restaurantListItems.listId, listIds))
        .groupBy(restaurantListItems.listId);

      const countByList: Record<number, number> = {};
      restaurantCounts.forEach(({ listId, count }) => {
        countByList[listId] = count;
      });

      listsWithCounts = lists.map(list => ({
        ...list,
        restaurantCount: countByList[list.id] || 0
      }));
    }

    res.json(listsWithCounts);
  } catch (error) {
    console.error("Error fetching user lists:", error);
    res.status(500).json({ error: "Failed to fetch user lists" });
  }
});

// GET /api/lists/:id/save-status - Check if a specific list is saved by current user
router.get('/:id/save-status', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(listId)) {
      return res.status(400).json({ error: 'Invalid list ID' });
    }

    const savedList = await db
      .select()
      .from(savedLists)
      .where(and(
        eq(savedLists.listId, listId),
        eq(savedLists.userId, userId)
      ))
      .limit(1);

    const saved = savedList.length > 0;
    
    const duration = Date.now() - startTime;
    console.log(`[LISTS] GET /api/lists/${listId}/save-status - ${duration}ms - Status: 200 - UserId: ${userId} - Saved: ${saved}`);
    
    res.json({ saved });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LISTS] GET /api/lists/${req.params.id}/save-status - ${duration}ms - Status: 500 - Error:`, error);
    res.status(500).json({ error: 'Failed to check save status' });
  }
});

// POST /api/lists/:id/save - Save a list (idempotent)
router.post('/:id/save', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(listId)) {
      return res.status(400).json({ error: 'Invalid list ID' });
    }

    // Check if list exists and user has access to it
    const listExists = await checkListAccessById(listId, userId);
    if (!listExists) {
      return res.status(404).json({ error: 'List not found or access denied' });
    }

    // Idempotent: check if already saved
    const existingSave = await db
      .select()
      .from(savedLists)
      .where(and(
        eq(savedLists.listId, listId),
        eq(savedLists.userId, userId)
      ))
      .limit(1);

    if (existingSave.length === 0) {
      // Insert new save
      await db.insert(savedLists).values({
        listId,
        userId,
      });

      // Increment save count
      await db
        .update(restaurantLists)
        .set({
          saveCount: sql`${restaurantLists.saveCount} + 1`,
        })
        .where(eq(restaurantLists.id, listId));
    }

    const duration = Date.now() - startTime;
    console.log(`[LISTS] POST /api/lists/${listId}/save - ${duration}ms - Status: 200 - UserId: ${userId}`);
    
    res.json({ success: true, saved: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LISTS] POST /api/lists/${req.params.id}/save - ${duration}ms - Status: 500 - Error:`, error);
    res.status(500).json({ error: 'Failed to save list' });
  }
});

// DELETE /api/lists/:id/save - Unsave a list (idempotent)
router.delete('/:id/save', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(listId)) {
      return res.status(400).json({ error: 'Invalid list ID' });
    }

    // Idempotent: delete if exists
    const deletedRows = await db
      .delete(savedLists)
      .where(and(
        eq(savedLists.listId, listId),
        eq(savedLists.userId, userId)
      ))
      .returning();

    if (deletedRows.length > 0) {
      // Decrement save count
      await db
        .update(restaurantLists)
        .set({
          saveCount: sql`GREATEST(${restaurantLists.saveCount} - 1, 0)`,
        })
        .where(eq(restaurantLists.id, listId));
    }

    const duration = Date.now() - startTime;
    console.log(`[LISTS] DELETE /api/lists/${listId}/save - ${duration}ms - Status: 200 - UserId: ${userId}`);
    
    res.json({ success: true, saved: false });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LISTS] DELETE /api/lists/${req.params.id}/save - ${duration}ms - Status: 500 - Error:`, error);
    res.status(500).json({ error: 'Failed to unsave list' });
  }
});

// POST /api/lists/:id/items - Add item to list with idempotency
router.post('/:id/items', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;
    const data = addItemSchema.parse(req.body);

    if (isNaN(listId)) {
      return res.status(400).json({ error: 'Invalid list ID' });
    }

    // Check if user owns or has edit access to the list
    const listAccess = await checkListEditAccess(listId, userId);
    if (!listAccess) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Idempotency: check if restaurant already exists in list
    const existingItem = await db
      .select()
      .from(restaurantListItems)
      .where(and(
        eq(restaurantListItems.listId, listId),
        eq(restaurantListItems.restaurantId, data.restaurantId)
      ))
      .limit(1);

    if (existingItem.length > 0) {
      // Return existing item (idempotent)
      const duration = Date.now() - startTime;
      console.log(`[LISTS] POST /api/lists/${listId}/items - ${duration}ms - Status: 200 - UserId: ${userId} - Existing item`);
      return res.json(existingItem[0]);
    }

    // Determine position
    let position = data.position;
    if (position === null || position === undefined) {
      // Append to end
      const maxPosition = await db
        .select({ maxPos: sql<number>`COALESCE(MAX(${restaurantListItems.position}), 0)` })
        .from(restaurantListItems)
        .where(eq(restaurantListItems.listId, listId));
      
      position = (maxPosition[0]?.maxPos || 0) + 1;
    } else {
      // Shift existing items to make room
      await db
        .update(restaurantListItems)
        .set({
          position: sql`${restaurantListItems.position} + 1`,
        })
        .where(and(
          eq(restaurantListItems.listId, listId),
          sql`${restaurantListItems.position} >= ${position}`
        ));
    }

    const [newItem] = await db.insert(restaurantListItems).values({
      listId,
      restaurantId: data.restaurantId,
      addedById: userId,
      position,
      rating: data.rating,
      priceAssessment: data.priceAssessment,
      liked: data.liked,
      disliked: data.disliked,
      notes: data.notes,
      mustTryDishes: data.mustTryDishes,
    }).returning();

    const duration = Date.now() - startTime;
    console.log(`[LISTS] POST /api/lists/${listId}/items - ${duration}ms - Status: 201 - UserId: ${userId} - RestaurantId: ${data.restaurantId}`);
    
    res.status(201).json(newItem);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LISTS] POST /api/lists/${req.params.id}/items - ${duration}ms - Status: 400/500 - Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to add item to list' });
  }
});

// PUT /api/lists/:id/items/reorder - Reorder list items
router.put('/:id/items/reorder', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const listId = parseInt(req.params.id);
    const userId = req.user!.id;
    const data = reorderItemsSchema.parse(req.body);

    if (isNaN(listId)) {
      return res.status(400).json({ error: 'Invalid list ID' });
    }

    // Check if user owns or has edit access to the list
    const listAccess = await checkListEditAccess(listId, userId);
    if (!listAccess) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Transactional reorder
    await db.transaction(async (tx) => {
      for (let i = 0; i < data.itemIds.length; i++) {
        await tx
          .update(restaurantListItems)
          .set({ position: i + 1 })
          .where(and(
            eq(restaurantListItems.id, data.itemIds[i]),
            eq(restaurantListItems.listId, listId)
          ));
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[LISTS] PUT /api/lists/${listId}/items/reorder - ${duration}ms - Status: 200 - UserId: ${userId} - Items: ${data.itemIds.length}`);
    
    res.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LISTS] PUT /api/lists/${req.params.id}/items/reorder - ${duration}ms - Status: 400/500 - Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

// Helper function to check list access based on normalized visibility
async function checkListAccessById(listId: number, userId: number | null): Promise<boolean> {
  const list = await db
    .select()
    .from(restaurantLists)
    .where(eq(restaurantLists.id, listId))
    .limit(1);

  if (list.length === 0) return false;

  return canAccessList(list[0], userId);
}

async function checkVisibilityV2Access(listData: any, userId: number): Promise<boolean> {
  switch (listData.visibilityV2) {
    case 'public':
      return true;
    
    case 'followers':
      // Check if user follows the list creator
      const followExists = await db
        .select()
        .from(require('../../shared/schema').userFollowers)
        .where(and(
          eq(require('../../shared/schema').userFollowers.followerId, userId),
          eq(require('../../shared/schema').userFollowers.followingId, listData.createdById),
          eq(require('../../shared/schema').userFollowers.status, 'following')
        ))
        .limit(1);
      return followExists.length > 0;
    
    case 'circle':
      if (!listData.visibilityCircleIds || listData.visibilityCircleIds.length === 0) {
        return false;
      }
      // Check if user is member of any of the specified circles
      const circleAccess = await db
        .select()
        .from(circleMembers)
        .where(and(
          inArray(circleMembers.circleId, listData.visibilityCircleIds),
          eq(circleMembers.userId, userId),
          eq(circleMembers.status, 'active')
        ))
        .limit(1);
      return circleAccess.length > 0;
    
    case 'private':
    default:
      return false;
  }
}

async function checkLegacyVisibilityAccess(listData: any, userId: number): Promise<boolean> {
  // Legacy logic: check makePublic, isPublic, shareWithCircle
  if (listData.makePublic || listData.isPublic) {
    return true;
  }

  if (listData.shareWithCircle && listData.circleId) {
    const circleAccess = await db
      .select()
      .from(circleMembers)
      .where(and(
        eq(circleMembers.circleId, listData.circleId),
        eq(circleMembers.userId, userId),
        eq(circleMembers.status, 'active')
      ))
      .limit(1);
    return circleAccess.length > 0;
  }

  return false;
}

async function checkListEditAccess(listId: number, userId: number): Promise<boolean> {
  const list = await db
    .select()
    .from(restaurantLists)
    .where(eq(restaurantLists.id, listId))
    .limit(1);

  if (list.length === 0) return false;

  // Only owner can edit for MVP (could be extended for collaborative editing)
  return list[0].createdById === userId;
}

export default router;