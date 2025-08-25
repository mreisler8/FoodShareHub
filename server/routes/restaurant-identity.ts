import { Router } from 'express';
import { z } from 'zod';
import { resolveRestaurantCanonicalId } from '../services/identity.js';
import { requireAuth } from '../auth.js';

const router = Router();

// Canonical identity resolution endpoint
router.get('/resolve', requireAuth, async (req, res) => {
  try {
    const query = z.object({
      restaurantId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
      googlePlaceId: z.string().optional(),
    }).parse(req.query);

    if (!query.restaurantId && !query.googlePlaceId) {
      return res.status(400).json({ 
        error: 'Either restaurantId or googlePlaceId must be provided' 
      });
    }

    const identity = await resolveRestaurantCanonicalId({
      restaurantId: query.restaurantId,
      googlePlaceId: query.googlePlaceId,
    });

    res.json(identity);
  } catch (error: any) {
    console.error('Identity resolution error:', error);
    
    if (error.cause?.code === 409) {
      return res.status(409).json({ 
        error: 'Restaurant ID and Google Place ID do not match',
        code: 'IDENTITY_MISMATCH'
      });
    }

    res.status(500).json({ 
      error: 'Failed to resolve restaurant identity' 
    });
  }
});

export default router;