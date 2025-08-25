/**
 * UNIVERSAL RESTAURANT ID SYSTEM
 * 
 * Problem: Platform breaks when mixing database IDs vs Google Place IDs
 * Solution: Universal identifier system that works for ANY restaurant, ANY user
 * 
 * Key Principle: ONE restaurant = ONE canonical identifier across ALL systems
 */

export interface RestaurantIdentifier {
  id?: number;
  googlePlaceId?: string;
  name?: string;
}

export interface UniversalRestaurantId {
  type: 'database' | 'google_place';
  canonical: string; // The single source of truth ID
  dbId?: number; // Database ID if exists
  googlePlaceId?: string; // Google Place ID if exists
}

/**
 * UNIVERSAL: Convert any restaurant reference to canonical ID
 * Works for search results, database records, API responses, UI navigation
 */
export function getCanonicalRestaurantId(restaurant: any): UniversalRestaurantId {
  // Priority 1: Use database ID if restaurant is saved in our system
  if (restaurant.id && typeof restaurant.id === 'number') {
    return {
      type: 'database',
      canonical: restaurant.id.toString(),
      dbId: restaurant.id,
      googlePlaceId: restaurant.googlePlaceId || restaurant.metadata?.googlePlaceId
    };
  }

  // Priority 2: Use Google Place ID for external restaurants
  const googlePlaceId = restaurant.googlePlaceId || 
                       restaurant.metadata?.googlePlaceId || 
                       restaurant.place_id ||
                       (typeof restaurant.id === 'string' && restaurant.id.startsWith('ChIJ') ? restaurant.id : null);

  if (googlePlaceId) {
    return {
      type: 'google_place',
      canonical: googlePlaceId,
      dbId: restaurant.id && typeof restaurant.id === 'number' ? restaurant.id : undefined,
      googlePlaceId: googlePlaceId
    };
  }

  // Fallback: Try string ID as Google Place ID
  if (typeof restaurant.id === 'string') {
    return {
      type: 'google_place',
      canonical: restaurant.id,
      googlePlaceId: restaurant.id
    };
  }

  throw new Error(`Cannot determine canonical ID for restaurant: ${JSON.stringify(restaurant)}`);
}

/**
 * UNIVERSAL: Parse any URL/API parameter to canonical ID
 */
export function parseRestaurantParam(param: string): UniversalRestaurantId {
  // Google Place ID pattern
  if (param.startsWith('ChIJ') || param.length > 10) {
    return {
      type: 'google_place',
      canonical: param,
      googlePlaceId: param
    };
  }

  // Database ID pattern
  const dbId = parseInt(param);
  if (!isNaN(dbId)) {
    return {
      type: 'database',
      canonical: param,
      dbId: dbId
    };
  }

  // Default to Google Place ID
  return {
    type: 'google_place',
    canonical: param,
    googlePlaceId: param
  };
}

/**
 * UNIVERSAL API ROUTING: Generate correct endpoints for any restaurant
 */
export function getRestaurantEndpoint(restaurant: any): string {
  const universal = getCanonicalRestaurantId(restaurant);
  
  if (universal.type === 'database' && universal.dbId) {
    return `/api/restaurants/${universal.dbId}`;
  } else {
    return `/api/restaurants?googlePlaceId=${encodeURIComponent(universal.canonical)}`;
  }
}

export function getRatingEndpoint(restaurant: any): string {
  const universal = getCanonicalRestaurantId(restaurant);
  
  if (universal.type === 'database' && universal.dbId) {
    return `/api/ratings/restaurant/${universal.dbId}?type=database`;
  } else {
    return `/api/ratings/restaurant/${encodeURIComponent(universal.canonical)}?type=google_place`;
  }
}

export function getCircleScoreEndpoint(restaurant: any): string {
  const universal = getCanonicalRestaurantId(restaurant);
  
  if (universal.type === 'database' && universal.dbId) {
    return `/api/circle-score/${universal.dbId}?type=database`;
  } else {
    return `/api/circle-score/${encodeURIComponent(universal.canonical)}?type=google_place`;
  }
}

/**
 * UNIVERSAL QUERY KEYS: Consistent React Query caching
 */
export function createRestaurantQueryKey(restaurant: any, endpoint: string): string[] {
  const universal = getCanonicalRestaurantId(restaurant);
  return [endpoint, universal.canonical, universal.type];
}

/**
 * UNIVERSAL API DATA: Extract data for CREATE/UPDATE operations
 */
export function extractApiData(restaurant: any): {
  restaurantId?: number;
  googlePlaceId?: string;
  restaurantName: string;
} {
  const universal = getCanonicalRestaurantId(restaurant);
  return {
    restaurantId: universal.dbId || null,
    googlePlaceId: universal.googlePlaceId || null,
    restaurantName: restaurant.name || 'Unknown Restaurant'
  };
}

/**
 * UNIVERSAL NAVIGATION: Generate correct URL paths
 */
export function getRestaurantPath(restaurant: any): string {
  const universal = getCanonicalRestaurantId(restaurant);
  
  if (universal.type === 'database' && universal.dbId) {
    return `/restaurants/${universal.dbId}`;
  } else {
    return `/restaurants?googlePlaceId=${encodeURIComponent(universal.canonical)}`;
  }
}