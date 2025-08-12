import { db } from '../db';
import { restaurants } from '../../shared/schema';
import { eq } from 'drizzle-orm';

interface IdentityInput {
  restaurantId?: number;
  placeId?: string;
}

export async function resolveRestaurantId(input: IdentityInput): Promise<number> {
  console.log('IDENTITY_RESOLVE:', { input });

  // If restaurantId is provided, validate it exists and return it
  if (input.restaurantId) {
    const existing = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, input.restaurantId)
    });
    
    if (existing) {
      console.log('IDENTITY_RESOLVE: Found existing restaurant by ID', { 
        restaurantId: input.restaurantId, 
        placeId: existing.googlePlaceId 
      });
      return input.restaurantId;
    } else {
      throw new Error(`Restaurant ID ${input.restaurantId} not found`);
    }
  }

  // If placeId is provided, lookup in restaurants.google_place_id
  if (input.placeId) {
    const existing = await db.query.restaurants.findFirst({
      where: eq(restaurants.googlePlaceId, input.placeId)
    });

    if (existing) {
      console.log('IDENTITY_RESOLVE: Found existing restaurant by placeId', { 
        restaurantId: existing.id, 
        placeId: input.placeId 
      });
      return existing.id;
    }

    // If not found, create a new restaurant record
    console.log('IDENTITY_RESOLVE: Creating new restaurant for placeId', { placeId: input.placeId });
    
    const [newRestaurant] = await db.insert(restaurants).values({
      googlePlaceId: input.placeId,
      name: `Restaurant ${input.placeId.slice(-8)}`, // Temporary name until Places API hydrates
      cuisine: 'Unknown',
      location: 'Unknown',
      priceRange: '$$',
      rating: 0,
      reviewCount: 0,
      isVerified: false,
      status: 'active'
    }).returning();

    console.log('IDENTITY_RESOLVE: Created new restaurant', { 
      restaurantId: newRestaurant.id, 
      placeId: input.placeId 
    });
    
    return newRestaurant.id;
  }

  throw new Error('Either restaurantId or placeId must be provided');
}