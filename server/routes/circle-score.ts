import express from 'express';
import { calculateCircleScore } from '../lib/circleScore';
import { circleScorePreCalculator } from '../lib/circleScoreCache';

const router = express.Router();

// GET /api/circle-score/:id - Get Circle Score for a restaurant
router.get('/:id', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { id } = req.params;
    const { type = 'restaurant' } = req.query; // 'restaurant' or 'google_place'
    
    let restaurantId: number | null = null;
    let googlePlaceId: string | null = null;
    
    if (type === 'google_place') {
      googlePlaceId = id;
    } else {
      restaurantId = parseInt(id);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ error: 'Invalid restaurant ID' });
      }
    }
    
    // Try to get cached score first
    let circleScore = circleScorePreCalculator.getCachedScore(restaurantId, googlePlaceId, req.user.id);
    
    // If not cached, calculate fresh
    if (!circleScore) {
      circleScore = await calculateCircleScore(restaurantId, googlePlaceId, req.user.id);
      
      // Trigger background pre-calculation for popular restaurants
      if (circleScore) {
        setImmediate(() => {
          circleScorePreCalculator.preCalculateForPopularRestaurants(restaurantId, googlePlaceId);
        });
      }
    }
    
    if (!circleScore) {
      return res.status(404).json({ 
        error: 'No Circle Score available',
        message: 'No data from your trusted network for this restaurant'
      });
    }
    
    res.json(circleScore);
  } catch (error) {
    console.error('Circle score API error:', error);
    res.status(500).json({ error: 'Failed to calculate Circle Score' });
  }
});

// GET /api/circle-score/batch - Get Circle Scores for multiple restaurants
router.post('/batch', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { restaurants } = req.body;
    
    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      return res.status(400).json({ error: 'Invalid restaurants array' });
    }
    
    if (restaurants.length > 20) {
      return res.status(400).json({ error: 'Too many restaurants requested (max 20)' });
    }
    
    const results: { [key: string]: any } = {};
    
    // Process each restaurant
    for (const restaurant of restaurants) {
      const { id, type = 'restaurant' } = restaurant;
      
      let restaurantId: number | null = null;
      let googlePlaceId: string | null = null;
      
      if (type === 'google_place') {
        googlePlaceId = id;
      } else {
        restaurantId = parseInt(id);
        if (isNaN(restaurantId)) continue;
      }
      
      const circleScore = await calculateCircleScore(restaurantId, googlePlaceId, req.user.id);
      
      const key = type === 'google_place' ? `google_${id}` : id.toString();
      results[key] = circleScore;
    }
    
    res.json(results);
  } catch (error) {
    console.error('Batch circle score API error:', error);
    res.status(500).json({ error: 'Failed to calculate Circle Scores' });
  }
});

export default router;