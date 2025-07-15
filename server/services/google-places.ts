
import axios from 'axios';
import { Restaurant } from '@shared/schema';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const API_TIMEOUT = 12000; // Increased timeout for better reliability
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('GOOGLE_MAPS_API_KEY is not set. Google Places API will not work.');
}

// Enhanced caching system
const searchCache = new Map<string, { data: Restaurant[]; timestamp: number; location?: string }>();
const detailsCache = new Map<string, { data: Partial<Restaurant>; timestamp: number }>();

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  types?: string[];
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  opening_hours?: {
    open_now?: boolean;
  };
  business_status?: string;
  permanently_closed?: boolean;
}

interface PlacesSearchResponse {
  results: GooglePlaceResult[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

interface PlaceDetailsResponse {
  result: GooglePlaceResult & {
    website?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
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
      relative_time_description: string;
    }>;
    user_ratings_total?: number;
    price_level?: number;
    business_status?: string;
    permanently_closed?: boolean;
    editorial_summary?: {
      overview?: string;
    };
    serves_delivery?: boolean;
    serves_dine_in?: boolean;
    serves_takeout?: boolean;
    wheelchair_accessible_entrance?: boolean;
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

  // Enhanced cuisine mapping with more specific types
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
    'mediterranean_restaurant': 'Mediterranean',
    'greek_restaurant': 'Greek',
    'korean_restaurant': 'Korean',
    'vietnamese_restaurant': 'Vietnamese',
    'middle_eastern_restaurant': 'Middle Eastern',
    'steakhouse': 'Steakhouse',
    'seafood_restaurant': 'Seafood',
    'vegetarian_restaurant': 'Vegetarian',
    'vegan_restaurant': 'Vegan',
    'breakfast_restaurant': 'Breakfast',
    'brunch_restaurant': 'Brunch',
    'coffee_shop': 'Coffee',
    'pizza_restaurant': 'Pizza',
    'sandwich_shop': 'Sandwiches',
    'sushi_restaurant': 'Sushi',
    'fast_food_restaurant': 'Fast Food',
    'fine_dining_restaurant': 'Fine Dining',
    'gastropub': 'Gastropub',
    'wine_bar': 'Wine Bar',
    'cocktail_bar': 'Cocktail Bar',
    'sports_bar': 'Sports Bar',
  };

  // Find the most specific cuisine type
  for (const type of types) {
    if (cuisineMap[type]) {
      return cuisineMap[type];
    }
  }

  // Default to "Restaurant" if no specific cuisine type is found
  return 'Restaurant';
};

// Enhanced semantic query mapping for Google Places
const SEMANTIC_QUERY_MAPPINGS = {
  'late night': 'restaurants open late night after hours',
  'brunch': 'brunch restaurants breakfast lunch weekend dining',
  'date night': 'romantic restaurants fine dining intimate wine bar',
  'family friendly': 'family restaurants kids children casual dining',
  'quick bite': 'fast food takeout quick service grab and go',
  'healthy': 'healthy restaurants salad organic vegetarian vegan fresh',
  'comfort food': 'comfort food home style hearty traditional restaurants',
  'michelin': 'michelin starred fine dining upscale restaurants',
  'trending': 'popular highly rated trending new restaurants',
  'cheap eats': 'affordable budget restaurants inexpensive dining',
  'outdoor dining': 'restaurants with patio outdoor seating terrace',
  'happy hour': 'bars restaurants happy hour drinks specials',
  'breakfast': 'breakfast restaurants morning dining coffee pancakes',
  'lunch': 'lunch restaurants midday dining quick lunch',
  'dinner': 'dinner restaurants evening dining fine dining',
  'drinks': 'bars cocktails wine beer drinks nightlife',
  'coffee': 'coffee shops cafes espresso breakfast morning',
  'dessert': 'dessert restaurants bakery ice cream sweets',
  'delivery': 'restaurants delivery takeout food delivery service',
  'takeout': 'takeout restaurants pickup fast food quick service',
} as const;

// Enhanced location-based query optimization
function enhanceQueryForGoogle(query: string, location?: { lat: number; lng: number }): string {
  const lowerQuery = query.toLowerCase().trim();
  
  // Remove redundant words
  let enhancedQuery = lowerQuery
    .replace(/\b(near me|nearby|around here|close to me)\b/gi, '')
    .replace(/\b(restaurant|restaurants)\b/gi, '')
    .trim();
  
  // Apply semantic mappings
  for (const [key, enhancement] of Object.entries(SEMANTIC_QUERY_MAPPINGS)) {
    if (lowerQuery.includes(key)) {
      enhancedQuery = enhancement;
      break;
    }
  }
  
  // Ensure we're searching for restaurants
  if (!enhancedQuery.includes('restaurant') && !enhancedQuery.includes('bar') && !enhancedQuery.includes('cafe')) {
    enhancedQuery += ' restaurant';
  }
  
  return enhancedQuery;
}

function determineSearchStrategy(query: string, location?: { lat: number; lng: number; radius?: number }) {
  const lowerQuery = query.toLowerCase();
  
  // Use Nearby Search for location-specific queries with coordinates
  if (location && (
    lowerQuery.includes('near me') ||
    lowerQuery.includes('nearby') ||
    lowerQuery.includes('around here') ||
    lowerQuery.length < 15 // Short queries work better with nearby search
  )) {
    return 'nearby';
  }
  
  // Use Text Search for complex semantic queries or specific restaurant names
  return 'text';
}

function generateCacheKey(query: string, location?: { lat: number; lng: number; radius?: number }): string {
  const locationKey = location ? `${location.lat.toFixed(3)},${location.lng.toFixed(3)},${location.radius || 10000}` : 'global';
  return `${query.toLowerCase().trim()}:${locationKey}`;
}

function getCachedResults(cacheKey: string): Restaurant[] | null {
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Cache hit for search: ${cacheKey}`);
    return cached.data;
  }
  return null;
}

function setCachedResults(cacheKey: string, data: Restaurant[], location?: string): void {
  searchCache.set(cacheKey, { data, timestamp: Date.now(), location });
  
  // Clean up old cache entries (keep last 100)
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    searchCache.delete(oldestKey);
  }
}

// Enhanced photo URL generator
function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
}

export const searchGooglePlaces = async (query: string, location?: { lat: number; lng: number; radius?: number }): Promise<Restaurant[]> => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not set');
    return [];
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  // Check cache first
  const cacheKey = generateCacheKey(query, location);
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) {
    return cachedResults;
  }

  try {
    const enhancedQuery = enhanceQueryForGoogle(query, location);
    const searchStrategy = determineSearchStrategy(query, location);
    let response: any;
    let allResults: GooglePlaceResult[] = [];
    
    console.log(`Using ${searchStrategy} search strategy for query: "${enhancedQuery}"`);
    
    if (searchStrategy === 'nearby' && location) {
      // Use Nearby Search API for location-based searches
      const nearbyParams = {
        location: `${location.lat},${location.lng}`,
        radius: Math.min(location.radius || 15000, 50000), // Default 15km, max 50km
        type: 'restaurant',
        keyword: enhancedQuery,
        key: GOOGLE_MAPS_API_KEY,
        // Enhanced parameters for better results
        opennow: query.toLowerCase().includes('open now') || query.toLowerCase().includes('open'),
        minprice: query.toLowerCase().includes('cheap') || query.toLowerCase().includes('budget') ? 1 : undefined,
        maxprice: query.toLowerCase().includes('fine dining') || query.toLowerCase().includes('michelin') || query.toLowerCase().includes('upscale') ? 4 : undefined,
      };

      // Remove undefined parameters
      Object.keys(nearbyParams).forEach(key => 
        nearbyParams[key as keyof typeof nearbyParams] === undefined && delete nearbyParams[key as keyof typeof nearbyParams]
      );

      response = await axios.get<PlacesSearchResponse>(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        {
          params: nearbyParams,
          timeout: API_TIMEOUT,
        }
      );
      
      allResults = response.data.results || [];
      
      // Handle pagination for nearby search (up to 3 pages)
      let nextPageToken = response.data.next_page_token;
      let pageCount = 1;
      
      while (nextPageToken && pageCount < 3 && allResults.length < 40) {
        // Wait 2 seconds before requesting next page (Google requirement)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const nextResponse = await axios.get<PlacesSearchResponse>(
            'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
            {
              params: {
                pagetoken: nextPageToken,
                key: GOOGLE_MAPS_API_KEY,
              },
              timeout: API_TIMEOUT,
            }
          );
          
          if (nextResponse.data.status === 'OK' && nextResponse.data.results) {
            allResults.push(...nextResponse.data.results);
            nextPageToken = nextResponse.data.next_page_token;
            pageCount++;
          } else {
            break;
          }
        } catch (pageError) {
          console.warn('Error fetching next page:', pageError);
          break;
        }
      }
      
    } else {
      // Use Text Search API for general searches
      const textParams = {
        query: enhancedQuery,
        type: 'restaurant',
        key: GOOGLE_MAPS_API_KEY,
        // Add location bias if available
        ...(location && {
          location: `${location.lat},${location.lng}`,
          radius: location.radius || 15000,
        }),
        // Enhanced text search parameters
        language: 'en',
        region: 'us', // Can be made configurable
      };

      response = await axios.get<PlacesSearchResponse>(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        {
          params: textParams,
          timeout: API_TIMEOUT,
        }
      );
      
      allResults = response.data.results || [];
    }

    if (response.data.status !== 'OK') {
      console.error('Google Places API error:', response.data.status, response.data.error_message);
      return [];
    }

    if (allResults.length === 0) {
      console.log(`No results found for query: "${query}"`);
      return [];
    }

    // Enhanced result processing and filtering
    const restaurants: Restaurant[] = allResults
      .filter(place => {
        // Filter out permanently closed businesses
        if (place.permanently_closed || place.business_status === 'CLOSED_PERMANENTLY') {
          return false;
        }
        
        // Filter out results that don't seem like restaurants
        if (place.types && !place.types.some(type => 
          type.includes('restaurant') || 
          type.includes('food') || 
          type.includes('bar') || 
          type.includes('cafe') ||
          type.includes('bakery') ||
          type.includes('meal_')
        )) {
          return false;
        }
        
        return true;
      })
      .map(place => {
        let location = place.formatted_address || place.vicinity || '';

        // Enhanced location parsing
        if (location) {
          const parts = location.split(',').map(part => part.trim());
          if (parts.length >= 2) {
            // For addresses like "123 Main St, Toronto, ON M5V 1A1, Canada"
            // Take the city and province/state: "Toronto, ON"
            const cityPart = parts[parts.length - 3]?.trim();
            const statePart = parts[parts.length - 2]?.trim();
            
            if (cityPart && statePart && !cityPart.match(/^\d/)) {
              // Remove postal code from state part if present
              const stateWithoutPostal = statePart.replace(/\s+[A-Z0-9]{3,}\s*$/, '');
              location = `${cityPart}, ${stateWithoutPostal}`;
            } else {
              // Fallback to last two meaningful parts
              const meaningfulParts = parts.filter(part => part && !part.match(/^\d{5}/));
              location = meaningfulParts.slice(-2).join(', ');
            }
          }
        }

        // Enhanced image URL from photos
        let imageUrl = null;
        if (place.photos && place.photos.length > 0) {
          imageUrl = getPhotoUrl(place.photos[0].photo_reference, 600);
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
          // Enhanced fields
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
          imageUrl,
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          rating: typeof place.rating === 'number' && !isNaN(place.rating) ? place.rating : 4.0,
          // Additional Google-specific data
          reviewCount: place.user_ratings_total || 0,
          isOpen: place.opening_hours?.open_now || null,
          businessStatus: place.business_status || null,
          openTableId: null,
          resyId: null,
        };
      })
      .sort((a, b) => {
        // Sort by rating and review count for better quality results
        const aScore = (a.rating || 0) * Math.log10((a.reviewCount || 0) + 10);
        const bScore = (b.rating || 0) * Math.log10((b.reviewCount || 0) + 10);
        return bScore - aScore;
      })
      .slice(0, 25); // Limit to top 25 results

    console.log(`Google Places search for "${query}" returned ${restaurants.length} results`);
    
    // Cache the results
    setCachedResults(cacheKey, restaurants, location ? `${location.lat},${location.lng}` : undefined);
    
    return restaurants;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND') {
        console.error('Network error: Unable to reach Google Places API');
      } else if (error.response?.status === 429) {
        console.error('Google Places API rate limit exceeded');
      } else if (error.response?.status === 403) {
        console.error('Google Places API access denied - check API key and billing');
      } else if (error.code === 'ECONNABORTED') {
        console.error('Google Places API request timeout');
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

  // Check cache first
  const cached = detailsCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Cache hit for place details: ${placeId}`);
    return cached.data;
  }

  try {
    const response = await axios.get<PlaceDetailsResponse>(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,international_phone_number,website,opening_hours,types,price_level,geometry,rating,user_ratings_total,photos,reviews,business_status,permanently_closed,editorial_summary,url,serves_delivery,serves_dine_in,serves_takeout,wheelchair_accessible_entrance',
          key: GOOGLE_MAPS_API_KEY,
          language: 'en',
        },
        timeout: API_TIMEOUT,
      }
    );

    if (response.data.status !== 'OK' || !response.data.result) {
      console.error('Google Place Details API error:', response.data.status, response.data.error_message);
      return null;
    }

    const place = response.data.result;

    // Enhanced image URL from photos
    let imageUrl = null;
    if (place.photos && place.photos.length > 0) {
      imageUrl = getPhotoUrl(place.photos[0].photo_reference, 800);
    }

    const details = {
      name: place.name || 'Unknown Restaurant',
      address: place.formatted_address || '',
      phone: place.formatted_phone_number || place.international_phone_number || null,
      website: place.website || null,
      hours: place.opening_hours?.weekday_text?.join('\n') || null,
      category: getCuisineType(place.types),
      priceRange: convertPriceLevel(place.price_level),
      latitude: place.geometry?.location.lat?.toString(),
      longitude: place.geometry?.location.lng?.toString(),
      googlePlaceId: place.place_id,
      rating: place.rating || 0,
      imageUrl,
      description: place.editorial_summary?.overview || null,
      // Enhanced Google Places data
      reviewCount: place.user_ratings_total || 0,
      isOpen: place.opening_hours?.open_now || null,
      businessStatus: place.business_status || null,
      isPermanentlyClosed: place.permanently_closed || false,
      photos: place.photos?.map(photo => ({
        reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
        url: getPhotoUrl(photo.photo_reference, 800),
      })) || [],
      googleReviews: place.reviews?.slice(0, 5).map(review => ({
        rating: review.rating,
        text: review.text,
        authorName: review.author_name,
        time: review.time,
        relativeTime: review.relative_time_description,
      })) || [],
      // Service options
      servesDelivery: place.serves_delivery || false,
      servesDineIn: place.serves_dine_in !== false, // Default to true if not specified
      servesTakeout: place.serves_takeout || false,
      wheelchairAccessible: place.wheelchair_accessible_entrance || false,
    };

    // Cache the results
    detailsCache.set(placeId, { data: details, timestamp: Date.now() });
    
    // Clean up old cache entries
    if (detailsCache.size > 200) {
      const oldestKey = detailsCache.keys().next().value;
      detailsCache.delete(oldestKey);
    }

    return details;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching Google Place details:', error.response?.status, error.message);
    } else {
      console.error('Unexpected error fetching Google Place details:', error);
    }
    return null;
  }
};

// Utility function to clear caches (useful for testing)
export const clearGooglePlacesCache = (): void => {
  searchCache.clear();
  detailsCache.clear();
  console.log('Google Places caches cleared');
};

// Get cache statistics
export const getGooglePlacesCacheStats = () => {
  return {
    searchCacheSize: searchCache.size,
    detailsCacheSize: detailsCache.size,
    searchCacheEntries: Array.from(searchCache.keys()),
    detailsCacheEntries: Array.from(detailsCache.keys()),
  };
};
