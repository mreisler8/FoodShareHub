import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { resolveRestaurantCanonicalId } from '../services/identity.js';
import { isFeatureEnabled } from '../config/features.js';
import { calculateCircleScore } from '../lib/circleScore.js';

const router = Router();

// Unified Circle Score endpoint (Phase 4)
router.get('/restaurant/:restaurantId/circle-score', requireAuth, async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.restaurantId);
    const userId = req.user!.id;

    if (isNaN(restaurantId)) {
      return res.status(400).json({ error: 'Invalid restaurant ID' });
    }

    // Use unified Circle Score calculation
    const result = await calculateCircleScore(restaurantId, userId);
    
    console.log(`CIRCLE_SCORE_UNIFIED restaurantId=${restaurantId} userId=${userId} score=${result.score}`);
    
    res.json(result);
  } catch (error) {
    console.error('Unified Circle Score error:', error);
    res.status(500).json({ error: 'Failed to calculate Circle Score' });
  }
});

// Legacy endpoint for Google Place ID (with deprecation notice)
router.get('/place/:googlePlaceId/circle-score', requireAuth, async (req, res) => {
  try {
    const googlePlaceId = req.params.googlePlaceId;
    const userId = req.user!.id;

    // Resolve to canonical restaurant ID
    const identity = await resolveRestaurantCanonicalId({
      googlePlaceId,
    });

    console.log(`CIRCLE_SCORE_LEGACY_DEPRECATED placeId=${googlePlaceId} -> restaurantId=${identity.restaurantId}`);

    // Forward to unified endpoint
    const result = await calculateCircleScore(identity.restaurantId, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Legacy Circle Score error:', error);
    res.status(500).json({ error: 'Failed to calculate Circle Score' });
  }
});

export default router;