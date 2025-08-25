import { db } from '../db.js';
import { restaurants, restaurantPlaceMap } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { isFeatureEnabled } from '../config/features.js';

export interface RestaurantIdentity {
  restaurantId: number;
  googlePlaceId: string | null;
  name?: string;
  created?: boolean;
}

/**
 * Canonical identity resolver - single source of truth for restaurant identity
 * Ensures every restaurant page connects correctly to Google Places data
 */
export async function resolveRestaurantCanonicalId({
  restaurantId,
  googlePlaceId
}: {
  restaurantId?: number;
  googlePlaceId?: string;
}): Promise<RestaurantIdentity> {
  
  // Case 1: restaurantId provided - look up its google_place_id
  if (restaurantId) {
    const restaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);
    
    if (restaurant.length === 0) {
      throw new Error(`Restaurant ${restaurantId} not found`);
    }

    const result: RestaurantIdentity = {
      restaurantId,
      googlePlaceId: restaurant[0].googlePlaceId,
      name: restaurant[0].name,
      created: false
    };

    // Validate consistency if both provided
    if (googlePlaceId && restaurant[0].googlePlaceId !== googlePlaceId) {
      if (isFeatureEnabled('STRICT_IDENTITY')) {
        console.error(`IDENTITY_MISMATCH restaurantId=${restaurantId} dbPlaceId=${restaurant[0].googlePlaceId} requestPlaceId=${googlePlaceId}`);
        throw new Error('Restaurant ID and Google Place ID do not match', { cause: { code: 409 } });
      }
    }

    console.log(`IDENTITY_RESOLVE restaurantId=${restaurantId} -> placeId=${result.googlePlaceId} created=false`);
    return result;
  }

  // Case 2: Only googlePlaceId provided - find or create restaurant
  if (googlePlaceId) {
    // First check restaurant_place_map
    const mapping = await db
      .select({ restaurantId: restaurantPlaceMap.restaurantId })
      .from(restaurantPlaceMap)
      .where(eq(restaurantPlaceMap.googlePlaceId, googlePlaceId))
      .limit(1);

    if (mapping.length > 0) {
      console.log(`IDENTITY_RESOLVE placeId=${googlePlaceId} -> restaurantId=${mapping[0].restaurantId} created=false`);
      return {
        restaurantId: mapping[0].restaurantId,
        googlePlaceId,
        created: false
      };
    }

    // Check restaurants table directly
    const existing = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.googlePlaceId, googlePlaceId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`IDENTITY_RESOLVE placeId=${googlePlaceId} -> restaurantId=${existing[0].id} created=false`);
      return {
        restaurantId: existing[0].id,
        googlePlaceId,
        name: existing[0].name,
        created: false
      };
    }

    // Create new restaurant with minimal data for now
    try {
      const newRestaurant = await db
        .insert(restaurants)
        .values({
          name: `Restaurant ${googlePlaceId.slice(-8)}`,
          location: 'Unknown',
          category: 'restaurant',
          priceRange: '$$',
          googlePlaceId: googlePlaceId,
        })
        .returning({ id: restaurants.id });

      // Add to mapping table
      await db
        .insert(restaurantPlaceMap)
        .values({
          restaurantId: newRestaurant[0].id,
          googlePlaceId
        })
        .onConflictDoNothing();

      console.log(`IDENTITY_RESOLVE placeId=${googlePlaceId} -> restaurantId=${newRestaurant[0].id} created=true`);
      return {
        restaurantId: newRestaurant[0].id,
        googlePlaceId,
        name: `Restaurant ${googlePlaceId.slice(-8)}`,
        created: true
      };
    } catch (error) {
      console.error(`Failed to create restaurant for placeId ${googlePlaceId}:`, error);
      throw new Error('Failed to resolve restaurant identity');
    }
  }

  throw new Error('Either restaurantId or googlePlaceId must be provided');
}

/**
 * Validates that a rating belongs to the correct restaurant
 * Prevents cross-contamination by enforcing strict binding
 */
export function validateRestaurantBinding(
  pageRestaurantId: number,
  ratingRestaurantId: number | null
): boolean {
  if (!isFeatureEnabled('STRICT_RATING_BINDING')) {
    return true;
  }

  if (ratingRestaurantId === null) {
    return false;
  }

  const isValid = pageRestaurantId === ratingRestaurantId;
  
  if (!isValid) {
    console.warn(`UI_BIND_GUARD prevented cross-restaurant render ridPage=${pageRestaurantId} ridRating=${ratingRestaurantId}`);
  }

  return isValid;
}