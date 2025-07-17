import { Router } from 'express';
import { authenticate } from '../auth';

const router = Router();

// Reverse geocoding endpoint for location services
router.get('/reverse', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        error: 'Invalid latitude or longitude format' 
      });
    }

    // For now, return a simple location response
    // In a full implementation, this would use a geocoding service
    const locationData = {
      latitude,
      longitude,
      city: 'Current Location',
      state: '',
      country: '',
      formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      accuracy: 'approximate'
    };

    res.json(locationData);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

export default router;