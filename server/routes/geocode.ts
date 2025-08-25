import { Router } from 'express';
import { authenticate } from '../auth';

const router = Router();

// City detection function
function detectCityFromCoordinates(lat: number, lng: number) {
  // Known cities with their approximate boundaries
  const cities = [
    { name: 'Toronto', lat: 43.6532, lng: -79.3832, radius: 0.5, state: 'ON', country: 'Canada' },
    { name: 'Vancouver', lat: 49.2827, lng: -123.1207, radius: 0.5, state: 'BC', country: 'Canada' },
    { name: 'Montreal', lat: 45.5017, lng: -73.5673, radius: 0.5, state: 'QC', country: 'Canada' },
    { name: 'Calgary', lat: 51.0447, lng: -114.0719, radius: 0.3, state: 'AB', country: 'Canada' },
    { name: 'Ottawa', lat: 45.4215, lng: -75.6972, radius: 0.3, state: 'ON', country: 'Canada' },
    { name: 'New York', lat: 40.7128, lng: -74.0060, radius: 0.5, state: 'NY', country: 'USA' },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, radius: 0.5, state: 'CA', country: 'USA' },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298, radius: 0.5, state: 'IL', country: 'USA' },
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194, radius: 0.3, state: 'CA', country: 'USA' },
    { name: 'London', lat: 51.5074, lng: -0.1278, radius: 0.5, country: 'UK' },
    { name: 'Paris', lat: 48.8566, lng: 2.3522, radius: 0.5, country: 'France' },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503, radius: 0.5, country: 'Japan' },
  ];

  // Calculate distance using Haversine formula
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Find closest city within radius
  for (const city of cities) {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    const radiusKm = city.radius * 111; // Convert degrees to km (roughly)
    
    if (distance <= radiusKm) {
      return {
        city: city.name,
        state: city.state,
        country: city.country,
        formatted_address: city.state 
          ? `${city.name}, ${city.state}, ${city.country}`
          : `${city.name}, ${city.country}`
      };
    }
  }

  // No match found, return coordinates
  return {
    city: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    state: '',
    country: 'Unknown',
    formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  };
}

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

    // Detect city from coordinates using known locations
    const cityInfo = detectCityFromCoordinates(latitude, longitude);
    
    const locationData = {
      latitude,
      longitude,
      city: cityInfo.city,
      state: cityInfo.state || '',
      country: cityInfo.country,
      formatted_address: cityInfo.formatted_address,
      accuracy: 'approximate'
    };

    res.json(locationData);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

export default router;