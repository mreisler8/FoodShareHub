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
  error_message?: string;
}

interface PlaceDetailsResponse {
  result: GooglePlaceResult & {
    website?: string;
    formatted_phone_number?: string;
    opening_hours?: {
      weekday_text?: string[];
      periods?: Array<{
        open: { day: number; time: string };
        close: { day: number; time: string };
      }>;
      open_now?: boolean;
    };
    photos?: Array<{
      photo_reference: string;
      width: number;
      height: number;
    }>;
    reviews?: Array<{
      rating: number;
      text: string;
      author_name: string;
      time: number;
    }>;
    user_ratings_total?: number;
    price_level?: number;
    business_status?: string;
    permanently_closed?: boolean;
    editorial_summary?: {
      overview?: string;
    };
  };
  status: string;
  error_message?: string;
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

export const searchGooglePlaces = async (query: string, location?: { lat: number; lng: number; radius?: number }): Promise<Restaurant[]> => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not set');
    return [];
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const searchParams: any = {
      query: `${query.trim()} restaurant`,
      type: 'restaurant',
      key: GOOGLE_MAPS_API_KEY,
    };

    // Add location bias if provided
    if (location) {
      searchParams.location = `${location.lat},${location.lng}`;
      searchParams.radius = location.radius || 10000; // 10km default radius
      console.log(`Searching near location: ${location.lat}, ${location.lng} with radius ${searchParams.radius}m`);
    }

    const response = await axios.get<PlacesSearchResponse>(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: searchParams,
        timeout: 5000, // 5 second timeout
      }
    );

    if (response.data.status !== 'OK') {
      console.error('Google Places API error:', response.data.status, response.data.error_message);
      return [];
    }

    if (!response.data.results || response.data.results.length === 0) {
      return [];
    }

    const restaurants: Restaurant[] = response.data.results.map(place => {
      let location = place.formatted_address || place.vicinity || '';

      // Extract meaningful location info - prioritize city/area over full address
      if (location) {
        const parts = location.split(',');
        if (parts.length >= 2) {
          // For addresses like "123 Main St, Toronto, ON M5V 1A1, Canada"
          // Take the city and province/state: "Toronto, ON"
          const cityPart = parts[parts.length - 3]?.trim();
          const statePart = parts[parts.length - 2]?.trim();
          
          if (cityPart && statePart) {
            // Remove postal code from state part if present
            const stateWithoutPostal = statePart.replace(/\s+[A-Z0-9]{3,}\s*$/, '');
            location = `${cityPart}, ${stateWithoutPostal}`;
          } else {
            // Fallback to last two parts
            location = parts.slice(-2).join(',').trim();
          }
        }
      }

      return {
        id: -1, // Temporary ID for Google places results
        name: place.name || 'Unknown Restaurant',
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
        rating: typeof place.rating === 'number' ? place.rating : 4.0,
      };
    });

    console.log(`Google Places search for "${query}" returned ${restaurants.length} results`);
    return restaurants;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND') {
        console.error('Network error: Unable to reach Google Places API');
      } else if (error.response?.status === 429) {
        console.error('Google Places API rate limit exceeded');
      } else if (error.response?.status === 403) {
        console.error('Google Places API access denied - check API key and billing');
      } else {
        console.error('Google Places API error:', error.response?.status, error.message);
      }
    } else {
      console.error('Unexpected error searching Google Places:', error);
    }
    return [];
  }
};

export const getPlaceDetails = async (placeId: string): Promise<Partial<Restaurant> | null> => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not set');
    return null;
  }

  if (!placeId) {
    console.error('Place ID is required');
    return null;
  }

  try {
    const response = await axios.get<PlaceDetailsResponse>(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,types,price_level,geometry,rating,user_ratings_total,photos,reviews,business_status,permanently_closed,editorial_summary',
          key: GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      }
    );

    if (response.data.status !== 'OK' || !response.data.result) {
      console.error('Google Place Details API error:', response.data.status, response.data.error_message);
      return null;
    }

    const place = response.data.result;

    return {
      name: place.name || 'Unknown Restaurant',
      address: place.formatted_address || '',
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      hours: place.opening_hours?.weekday_text?.join('\n') || null,
      category: getCuisineType(place.types),
      priceRange: convertPriceLevel(place.price_level),
      latitude: place.geometry?.location.lat?.toString(),
      longitude: place.geometry?.location.lng?.toString(),
      googlePlaceId: place.place_id,
      rating: place.rating || 0,
      // Enhanced Google Places data
      reviewCount: place.user_ratings_total || 0,
      isOpen: place.opening_hours?.open_now || null,
      businessStatus: place.business_status || null,
      isPermanentlyClosed: place.permanently_closed || false,
      description: place.editorial_summary?.overview || null,
      photos: place.photos?.map(photo => ({
        reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
      })) || [],
      googleReviews: place.reviews?.map(review => ({
        rating: review.rating,
        text: review.text,
        authorName: review.author_name,
        time: review.time,
      })) || [],
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching Google Place details:', error.response?.status, error.message);
    } else {
      console.error('Unexpected error fetching Google Place details:', error);
    }
    return null;
  }
};