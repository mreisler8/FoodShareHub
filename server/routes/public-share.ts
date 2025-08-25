/**
 * Public Share Routes
 * 
 * Handles public list sharing via slug URLs without authentication
 */

import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { restaurantLists, restaurantListItems, restaurants, users } from '../../shared/schema';
import { transformListResponse, checkListAccess } from '../utils/visibility-normalizer';

const router = Router();

// GET /u/:handle/l/:slug - Public list access
router.get('/u/:handle/l/:slug', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { handle, slug } = req.params;

    // Find user by username (handle)
    const user = await db
      .select({ id: users.id, name: users.name, username: users.username })
      .from(users)
      .where(eq(users.username, handle))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find list by slug and user
    const list = await db
      .select()
      .from(restaurantLists)
      .where(eq(restaurantLists.slug as any, slug))
      .limit(1);

    if (list.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }

    const listData = list[0];

    // Verify this list belongs to the user
    if (listData.createdById !== user[0].id) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Check if list is publicly accessible (no auth required)
    const hasAccess = await checkListAccess(
      listData,
      null, // Anonymous access
      async () => false, // No circle access for anonymous
      async () => false, // No follower access for anonymous
    );

    if (!hasAccess) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Get list items with restaurant details
    const items = await db
      .select({
        id: restaurantListItems.id,
        restaurantId: restaurantListItems.restaurantId,
        rating: restaurantListItems.rating,
        priceAssessment: restaurantListItems.priceAssessment,
        liked: restaurantListItems.liked,
        disliked: restaurantListItems.disliked,
        notes: restaurantListItems.notes,
        mustTryDishes: restaurantListItems.mustTryDishes,
        position: restaurantListItems.position,
        addedAt: restaurantListItems.addedAt,
        // Restaurant details
        restaurantName: restaurants.name,
        restaurantLocation: restaurants.location,
        restaurantCuisine: restaurants.cuisine,
        restaurantPriceRange: restaurants.priceRange,
        restaurantImageUrl: restaurants.imageUrl,
      })
      .from(restaurantListItems)
      .leftJoin(restaurants, eq(restaurantListItems.restaurantId, restaurants.id))
      .where(eq(restaurantListItems.listId, listData.id))
      .orderBy(restaurantListItems.position);

    // Transform for public response
    const publicList = transformListResponse(listData);
    
    const response = {
      list: {
        ...publicList,
        creator: {
          name: user[0].name,
          username: user[0].username,
        },
      },
      items: items.map(item => ({
        id: item.id,
        position: item.position,
        rating: item.rating,
        priceAssessment: item.priceAssessment,
        liked: item.liked,
        disliked: item.disliked,
        notes: item.notes,
        mustTryDishes: item.mustTryDishes,
        addedAt: item.addedAt,
        restaurant: {
          id: item.restaurantId,
          name: item.restaurantName,
          location: item.restaurantLocation,
          cuisine: item.restaurantCuisine,
          priceRange: item.restaurantPriceRange,
          imageUrl: item.restaurantImageUrl,
        },
      })),
      shareUrl: `${req.protocol}://${req.get('host')}/u/${handle}/l/${slug}`,
    };

    const duration = Date.now() - startTime;
    console.log(`[PUBLIC] GET /u/${handle}/l/${slug} - ${duration}ms - Status: 200 - Items: ${items.length}`);

    res.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PUBLIC] GET /u/${req.params.handle}/l/${req.params.slug} - ${duration}ms - Status: 500 - Error:`, error);
    res.status(500).json({ error: 'Failed to load list' });
  }
});

export default router;