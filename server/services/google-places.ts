import axios from 'axios';
import { Restaurant } from '@shared/schema';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('GOOGLE_MAPS_API_KEY is not set. Google Places API will not work.');
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  types?: string[];
  price_level?: number;
  rating?: number;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlacesSearchResponse {
  results: GooglePlaceResult[];
  status: string;
}

interface PlaceDetailsResponse {
  result: GooglePlaceResult & {
    website?: string;
    formatted_phone_number?: string;
    opening_hours?: {
      weekday_text?: string[];
    };
    photos?: Array<{
      photo_reference: string;
    }>;
  };
  status: string;
}

const convertPriceLevel = (level?: number): string => {
  if (level === undefined) return '$$';
  const priceMap: Record<number, string> = {
    0: '$',
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$'
  };
  return priceMap[level] || '$$';
};

const getCuisineType = (types?: string[]): string => {
  if (!types || types.length === 0) return 'Restaurant';
  
  // Map Google place types to readable cuisine types
  const cuisineMap: Record<string, string> = {
    'bakery': 'Bakery',
    'bar': 'Bar',
    'cafe': 'Cafe',
    'restaurant': 'Restaurant',
    'food': 'Food',
    'meal_takeaway': 'Takeaway',
    'meal_delivery': 'Delivery',
    'italian_restaurant': 'Italian',
    'japanese_restaurant': 'Japanese',
    'chinese_restaurant': 'Chinese',
    'mexican_restaurant': 'Mexican',
    'thai_restaurant': 'Thai',
    'indian_restaurant': 'Indian',
    'french_restaurant': 'French',
    'american_restaurant': 'American',
    'steakhouse': 'Steakhouse',
    'seafood_restaurant': 'Seafood',
    'vegetarian_restaurant': 'Vegetarian',
    'breakfast_restaurant': 'Breakfast',
    'coffee_shop': 'Coffee',
    'pizza_restaurant': 'Pizza',
  };
  
  // Find the first matching cuisine type
  for (const type of types) {
    if (cuisineMap[type]) {
      return cuisineMap[type];
    }
  }
  
  // Default to "Restaurant" if no specific cuisine type is found
  return 'Restaurant';
};

export const searchGooglePlaces = async (query: string): Promise<Restaurant[]> => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not set');
    return [];
  }

  try {
    const response = await axios.get<PlacesSearchResponse>(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: `${query} restaurant`,
          type: 'restaurant',
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    if (response.data.status !== 'OK') {
      console.error('Google Places API error:', response.data.status);
      return [];
    }

    const restaurants: Restaurant[] = response.data.results.map(place => {
      let location = place.formatted_address || place.vicinity || '';
      
      // Extract city or area
      if (location) {
        const parts = location.split(',');
        if (parts.length > 1) {
          // Take the last 2 parts if available
          location = parts.slice(-2).join(',').trim();
        }
      }
      
      return {
        id: -1, // Temporary ID for Google places results
        name: place.name,
        location,
        category: getCuisineType(place.types),
        priceRange: convertPriceLevel(place.price_level),
        country: 'Unknown',
        latitude: place.geometry?.location.lat?.toString() || null,
        longitude: place.geometry?.location.lng?.toString() || null,
        googlePlaceId: place.place_id,
        // Fields that need to be present but aren't available from Google Places API
        openTableId: null,
        resyId: null,
        address: place.formatted_address || place.vicinity || '',
        neighborhood: null,
        city: null,
        state: null,
        postalCode: null,
        phone: null,
        website: null,
        cuisine: getCuisineType(place.types),
        hours: null,
        description: null,
        imageUrl: null,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    console.log(`Google Places search for "${query}" returned ${restaurants.length} results`);
    return restaurants;
  } catch (error) {
    console.error('Error searching Google Places:', error);
    return [];
  }
};

export const getPlaceDetails = async (placeId: string): Promise<Partial<Restaurant> | null> => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not set');
    return null;
  }

  try {
    const response = await axios.get<PlaceDetailsResponse>(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,types,price_level,geometry',
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    if (response.data.status !== 'OK' || !response.data.result) {
      console.error('Google Place Details API error:', response.data.status);
      return null;
    }

    const place = response.data.result;
    
    return {
      name: place.name,
      address: place.formatted_address || '',
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      hours: place.opening_hours?.weekday_text?.join('\n') || null,
      category: getCuisineType(place.types),
      priceRange: convertPriceLevel(place.price_level),
      latitude: place.geometry?.location.lat?.toString(),
      longitude: place.geometry?.location.lng?.toString(),
      googlePlaceId: place.place_id,
    };
  } catch (error) {
    console.error('Error getting Google Place details:', error);
    return null;
  }
};