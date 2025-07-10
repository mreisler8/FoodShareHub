import { Router } from "express";
import { authenticate } from "../auth";
import { db } from "../db";
import { restaurants } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { getPlaceDetails } from "../services/google-places";

const router = Router();

// Get restaurant details by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        error: "Restaurant ID is required",
        code: "MISSING_ID"
      });
    }

    // Check if it's a Google Places result
    if (id.startsWith('google_')) {
      const googlePlaceId = id.replace('google_', '');
      
      try {
        const placeDetails = await getPlaceDetails(googlePlaceId);
        
        if (!placeDetails) {
          return res.status(404).json({ 
            error: "Restaurant not found",
            code: "RESTAURANT_NOT_FOUND"
          });
        }

        // Format Google Places details to match our restaurant format
        const restaurantDetails = {
          id: `google_${googlePlaceId}`,
          name: placeDetails.name || 'Unknown Restaurant',
          location: placeDetails.address || 'Unknown location',
          address: placeDetails.address || '',
          phone: placeDetails.phone || null,
          website: placeDetails.website || null,
          hours: placeDetails.hours || null,
          category: placeDetails.category || 'Restaurant',
          cuisine: placeDetails.cuisine || 'Restaurant',
          priceRange: placeDetails.priceRange || '$$',
          rating: placeDetails.rating || 4.0,
          imageUrl: null,
          description: null,
          googlePlaceId: googlePlaceId,
          source: 'google'
        };

        return res.json(restaurantDetails);
      } catch (googleError) {
        console.error("Error fetching Google Place details:", googleError);
        return res.status(500).json({ 
          error: "Failed to fetch restaurant details from Google",
          code: "GOOGLE_API_ERROR"
        });
      }
    }

    // Try to fetch from database
    const restaurantId = parseInt(id);
    if (isNaN(restaurantId)) {
      return res.status(400).json({ 
        error: "Invalid restaurant ID format",
        code: "INVALID_ID_FORMAT"
      });
    }

    const restaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!restaurant || restaurant.length === 0) {
      return res.status(404).json({ 
        error: "Restaurant not found",
        code: "RESTAURANT_NOT_FOUND"
      });
    }

    const restaurantData = restaurant[0];
    
    // Check if we need to fetch location from Google Places
    let location = restaurantData.location;
    let address = restaurantData.address || '';
    
    if ((!location || location === 'Unknown location') && restaurantData.googlePlaceId) {
      try {
        console.log("Fetching location from Google Places for restaurant:", restaurantData.name);
        const placeDetails = await getPlaceDetails(restaurantData.googlePlaceId);
        if (placeDetails && placeDetails.address) {
          location = placeDetails.address;
          address = placeDetails.address;
        }
      } catch (error) {
        console.error("Error fetching location from Google Places:", error);
        // Keep existing location if Google Places fails
      }
    }
    
    // Format database restaurant to match our detail format
    const restaurantDetails = {
      id: restaurantData.id.toString(),
      name: restaurantData.name,
      location: location,
      address: address,
      phone: restaurantData.phone || null,
      website: restaurantData.website || null,
      hours: restaurantData.hours || null,
      category: restaurantData.category,
      cuisine: restaurantData.cuisine || restaurantData.category,
      priceRange: restaurantData.priceRange,
      rating: restaurantData.rating || 4.0,
      imageUrl: restaurantData.imageUrl || null,
      description: restaurantData.description || null,
      googlePlaceId: restaurantData.googlePlaceId || null,
      source: 'database'
    };

    res.json(restaurantDetails);

  } catch (error) {
    console.error("Error fetching restaurant details:", error);
    res.status(500).json({ 
      error: "Failed to fetch restaurant details",
      code: "INTERNAL_ERROR"
    });
  }
});

export default router;