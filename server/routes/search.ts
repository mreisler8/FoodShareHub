import { Router } from "express";
import { db } from "../db";
import { restaurants, restaurantLists, posts, users } from "@shared/schema";
import { like, or, eq } from "drizzle-orm";
import { authenticate } from "../auth";

const router = Router();

interface GooglePlaceResult {
  place_id: string;
  name: string;
  rating?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  price_level?: number;
  types?: string[];
}

interface SearchResult {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  avgRating: number;
  location?: string;
  source: 'database' | 'google';
}

// Helper function to get Google Places photo URL
function getPhotoUrl(photoReference: string): string {
  const baseUrl = 'https://maps.googleapis.com/maps/api/place/photo';
  const maxWidth = 400;
  return `${baseUrl}?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
}

// Helper function to determine cuisine type from Google Places types
function getCuisineFromTypes(types: string[]): string {
  const cuisineMap: { [key: string]: string } = {
    'italian_restaurant': 'Italian',
    'chinese_restaurant': 'Chinese',
    'japanese_restaurant': 'Japanese',
    'mexican_restaurant': 'Mexican',
    'indian_restaurant': 'Indian',
    'thai_restaurant': 'Thai',
    'french_restaurant': 'French',
    'american_restaurant': 'American',
    'pizza_restaurant': 'Pizza',
    'seafood_restaurant': 'Seafood',
    'steakhouse': 'Steakhouse',
    'fast_food_restaurant': 'Fast Food'
  };

  for (const type of types) {
    if (cuisineMap[type]) {
      return cuisineMap[type];
    }
  }
  return 'Restaurant';
}

router.get('/', authenticate, async (req, res) => {
  try {
    const q = req.query.q as string;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const query = q.trim();
    const results: SearchResult[] = [];

    // First, search local database
    const dbResults = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,


// Unified search endpoint
router.get('/unified', authenticate, async (req, res) => {
  try {
    const q = req.query.q as string;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const query = q.trim();
    const results = {
      restaurants: [],
      lists: [],
      posts: [],
      users: []
    };

    // Search restaurants
    const restaurantResults = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        location: restaurants.location,
        cuisine: restaurants.cuisine,
        category: restaurants.category
      })
      .from(restaurants)
      .where(
        or(
          like(restaurants.name, `%${query}%`),
          like(restaurants.cuisine, `%${query}%`),
          like(restaurants.category, `%${query}%`),
          like(restaurants.location, `%${query}%`)
        )
      )
      .limit(5);

    results.restaurants = restaurantResults.map(restaurant => ({
      id: restaurant.id.toString(),
      name: restaurant.name,
      subtitle: `${restaurant.cuisine || restaurant.category} • ${restaurant.location}`,
      type: 'restaurant' as const,
      location: restaurant.location
    }));

    // Search restaurant lists
    const listResults = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        description: restaurantLists.description,
        createdById: restaurantLists.createdById,
        primaryLocation: restaurantLists.primaryLocation,
        visibility: restaurantLists.visibility
      })
      .from(restaurantLists)
      .leftJoin(users, eq(restaurantLists.createdById, users.id))
      .where(
        or(
          like(restaurantLists.name, `%${query}%`),
          like(restaurantLists.description, `%${query}%`),
          like(restaurantLists.primaryLocation, `%${query}%`)
        )
      )
      .limit(5);

    results.lists = listResults.map(list => ({
      id: list.restaurant_lists.id.toString(),
      name: list.restaurant_lists.name,
      subtitle: list.restaurant_lists.description || 
                (list.restaurant_lists.primaryLocation ? `List • ${list.restaurant_lists.primaryLocation}` : 'Restaurant List'),
      type: 'list' as const
    }));

    // Search posts
    const postResults = await db
      .select({
        id: posts.id,
        content: posts.content,
        userId: posts.userId,
        restaurantId: posts.restaurantId,
        createdAt: posts.createdAt
      })
      .from(posts)
      .leftJoin(restaurants, eq(posts.restaurantId, restaurants.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .where(
        or(
          like(posts.content, `%${query}%`),
          like(restaurants.name, `%${query}%`)
        )
      )
      .limit(5);

    results.posts = postResults.map(post => ({
      id: post.posts.id.toString(),
      name: post.posts.content.substring(0, 50) + (post.posts.content.length > 50 ? '...' : ''),
      subtitle: `Post ${post.posts.createdAt ? '• ' + new Date(post.posts.createdAt).toLocaleDateString() : ''}`,
      type: 'post' as const
    }));

    // Search users
    const userResults = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        bio: users.bio
      })
      .from(users)
      .where(
        or(
          like(users.name, `%${query}%`),
          like(users.username, `%${query}%`),
          like(users.bio, `%${query}%`)
        )
      )
      .limit(5);

    results.users = userResults.map(user => ({
      id: user.id.toString(),
      name: user.name,
      subtitle: user.bio || `@${user.username}`,
      type: 'user' as const
    }));

    console.log(`Unified search for "${query}" returned:`, {
      restaurants: results.restaurants.length,
      lists: results.lists.length,
      posts: results.posts.length,
      users: results.users.length
    });

    res.json(results);

  } catch (error) {
    console.error('Unified search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

        thumbnailUrl: restaurants.imageUrl,
        location: restaurants.location
      })
      .from(restaurants)
      .where(
        or(
          like(restaurants.name, `%${query}%`),
          like(restaurants.cuisine, `%${query}%`),
          like(restaurants.category, `%${query}%`)
        )
      )
      .limit(3); // Limit local results to leave room for Google results

    // Convert database results to SearchResult format
    dbResults.forEach(restaurant => {
      results.push({
        id: restaurant.id.toString(),
        name: restaurant.name,
        thumbnailUrl: restaurant.thumbnailUrl,
        avgRating: 4.0, // Default rating for database restaurants
        location: restaurant.location || undefined,
        source: 'database'
      });
    });

    // If we have room for more results and Google Places API is available, search Google Places
    if (results.length < 5 && process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const googleApiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=restaurant&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        
        const response = await fetch(googleApiUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.results) {
          const googleResults = data.results.slice(0, 5 - results.length).map((place: GooglePlaceResult): SearchResult => {
            const thumbnailUrl = place.photos && place.photos.length > 0 
              ? getPhotoUrl(place.photos[0].photo_reference)
              : null;

            return {
              id: `google_${place.place_id}`,
              name: place.name,
              thumbnailUrl,
              avgRating: place.rating || 4.0,
              location: place.formatted_address,
              source: 'google'
            };
          });

          results.push(...googleResults);
        }
      } catch (googleError) {
        console.error('Google Places API error:', googleError);
        // Continue with database results only
      }
    }

    // Limit to 5 results maximum as per user story
    const finalResults = results.slice(0, 5);

    console.log(`Search for "${query}" returned ${finalResults.length} results`);
    res.json(finalResults);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;