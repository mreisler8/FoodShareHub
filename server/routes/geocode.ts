import { Router } from 'express';
import { authenticate } from '../auth';

const router = Router();

// Reverse geocoding endpoint
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn('Google Places API key not found, falling back to coordinates');
      return res.json({
        results: [],
        city: `${parseFloat(lat as string).toFixed(2)}, ${parseFloat(lng as string).toFixed(2)}`
      });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      
      // Extract city name from address components
      const cityComponent = result.address_components.find((component: any) => 
        component.types.includes('locality') || 
        component.types.includes('administrative_area_level_1')
      );
      
      const city = cityComponent?.long_name || result.formatted_address.split(',')[0];
      
      return res.json({
        results: data.results,
        city: city
      });
    }
    
    // Fallback to coordinates if no results
    return res.json({
      results: [],
      city: `${parseFloat(lat as string).toFixed(2)}, ${parseFloat(lng as string).toFixed(2)}`
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    const { lat, lng } = req.query;
    return res.json({
      results: [],
      city: `${parseFloat(lat as string).toFixed(2)}, ${parseFloat(lng as string).toFixed(2)}`
    });
  }
});

export default router;