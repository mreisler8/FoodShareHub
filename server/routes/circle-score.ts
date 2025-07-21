import express from 'express';
import rateLimit from 'express-rate-limit';
import { calculateCircleScore } from '../lib/circleScore';

const router = express.Router();

// Rate limiting for Circle Score API
const circleScoreRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many Circle Score requests',
    resetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all Circle Score routes
router.use(circleScoreRateLimit);

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
    
    // Calculate Circle Score with built-in caching
    const circleScore = await calculateCircleScore(restaurantId, googlePlaceId, req.user.id);
    
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