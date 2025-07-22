/**
 * Utility functions for handling restaurant identifiers consistently across the application
 * 
 * Core Problem: Restaurants can be identified by either:
 * 1. Database ID (integer) - for restaurants saved in our database
 * 2. Google Place ID (string) - for restaurants from Google Places API
 * 
 * This utility ensures consistent handling across all APIs and components.
 */

export interface RestaurantIdentifier {
  id?: number;
  googlePlaceId?: string;
}

export interface NormalizedRestaurantId {
  type: 'database' | 'google_place';
  value: string | number;
  queryParam: string; // For API endpoints
}

/**
 * Normalize a restaurant identifier for consistent API usage
 */
export function normalizeRestaurantId(identifier: string | number | RestaurantIdentifier): NormalizedRestaurantId {
  // Handle object input (from restaurant data)
  if (typeof identifier === 'object') {
    if (identifier.googlePlaceId) {
      return {
        type: 'google_place',
        value: identifier.googlePlaceId,
        queryParam: identifier.googlePlaceId
      };
    } else if (identifier.id) {
      return {
        type: 'database',
        value: identifier.id,
        queryParam: identifier.id.toString()
      };
    }
    throw new Error('Invalid restaurant identifier object');
  }

  // Handle string input (from URL params or Google Place IDs)
  if (typeof identifier === 'string') {
    // Google Place IDs typically start with 'ChIJ' or are longer than 10 chars
    if (identifier.startsWith('ChIJ') || identifier.length > 10) {
      return {
        type: 'google_place',
        value: identifier,
        queryParam: identifier
      };
    }
    
    // Try to parse as database ID
    const parsed = parseInt(identifier);
    if (!isNaN(parsed)) {
      return {
        type: 'database',
        value: parsed,
        queryParam: parsed.toString()
      };
    }
    
    // Fallback to treating as Google Place ID
    return {
      type: 'google_place',
      value: identifier,
      queryParam: identifier
    };
  }

  // Handle number input (database ID)
  if (typeof identifier === 'number') {
    return {
      type: 'database',
      value: identifier,
      queryParam: identifier.toString()
    };
  }

  throw new Error('Invalid restaurant identifier type');
}

/**
 * Generate the correct API endpoint for a restaurant
 */
export function getRestaurantEndpoint(identifier: string | number | RestaurantIdentifier): string {
  const normalized = normalizeRestaurantId(identifier);
  
  if (normalized.type === 'google_place') {
    return `/api/restaurants?googlePlaceId=${encodeURIComponent(normalized.queryParam)}`;
  } else {
    return `/api/restaurants/${normalized.queryParam}`;
  }
}

/**
 * Generate the correct rating endpoint for a restaurant
 */
export function getRatingEndpoint(identifier: string | number | RestaurantIdentifier): string {
  const normalized = normalizeRestaurantId(identifier);
  
  if (normalized.type === 'google_place') {
    return `/api/ratings/restaurant/${encodeURIComponent(normalized.queryParam)}?type=google_place`;
  } else {
    return `/api/ratings/restaurant/${normalized.queryParam}?type=database`;
  }
}

/**
 * Generate the correct Circle Score endpoint for a restaurant
 */
export function getCircleScoreEndpoint(identifier: string | number | RestaurantIdentifier): string {
  const normalized = normalizeRestaurantId(identifier);
  
  if (normalized.type === 'google_place') {
    return `/api/circle-score/${encodeURIComponent(normalized.queryParam)}?type=google_place`;
  } else {
    return `/api/circle-score/${normalized.queryParam}?type=database`;
  }
}

/**
 * Create query key for React Query that works consistently
 */
export function createRestaurantQueryKey(identifier: string | number | RestaurantIdentifier, endpoint: string): string[] {
  const normalized = normalizeRestaurantId(identifier);
  return [endpoint, normalized.queryParam, normalized.type];
}

/**
 * Extract restaurant data for API calls (CREATE/UPDATE operations)
 */
export function extractRestaurantDataForApi(restaurant: any): {
  restaurantId?: number;
  googlePlaceId?: string;
  restaurantName: string;
} {
  return {
    restaurantId: restaurant.id || null,
    googlePlaceId: restaurant.googlePlaceId || null,
    restaurantName: restaurant.name
  };
}