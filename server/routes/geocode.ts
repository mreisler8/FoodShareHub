
import { Router } from 'express';
import axios from 'axios';

const router = Router();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface GeocodeResult {
  city?: string;
  state?: string;
  country?: string;
  formatted_address?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

// Enhanced city extraction from Google Geocoding API
const extractCityFromGoogleResult = (result: any): string => {
  if (!result.address_components) return '';
  
  // Priority order for city extraction
  const cityTypes = [
    'locality',                    // City
    'administrative_area_level_2', // County
    'administrative_area_level_1', // State/Province
    'sublocality_level_1',        // Neighborhood
    'postal_town'                 // Postal town
  ];
  
  for (const cityType of cityTypes) {
    const component = result.address_components.find((comp: any) => 
      comp.types.includes(cityType)
    );
    if (component) {
      return component.long_name;
    }
  }
  
  return '';
};

// Enhanced reverse geocoding with multiple fallback strategies
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    
    // Primary: Google Geocoding API
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            latlng: `${latitude},${longitude}`,
            key: GOOGLE_MAPS_API_KEY,
            result_type: 'locality|administrative_area_level_1|administrative_area_level_2',
            language: 'en'
          },
          timeout: 5000
        });
        
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const result = response.data.results[0];
          const city = extractCityFromGoogleResult(result);
          
          if (city) {
            console.log(`Reverse geocoding success: ${latitude}, ${longitude} -> ${city}`);
            return res.json({
              results: response.data.results,
              city,
              formatted_address: result.formatted_address,
              status: 'success',
              source: 'google'
            });
          }
        }
        
        console.warn('Google Geocoding API returned no city results');
      } catch (error) {
        console.error('Google Geocoding API error:', error);
      }
    }
    
    // Fallback 1: OpenStreetMap Nominatim (Free)
    try {
      const osmResponse = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
          zoom: 10
        },
        headers: {
          'User-Agent': 'TasteBuds-App/1.0'
        },
        timeout: 5000
      });
      
      if (osmResponse.data && osmResponse.data.address) {
        const address = osmResponse.data.address;
        const city = address.city || address.town || address.village || 
                    address.municipality || address.county || address.state;
        
        if (city) {
          console.log(`OSM reverse geocoding success: ${latitude}, ${longitude} -> ${city}`);
          return res.json({
            results: [osmResponse.data],
            city,
            formatted_address: osmResponse.data.display_name,
            status: 'success',
            source: 'openstreetmap'
          });
        }
      }
    } catch (error) {
      console.error('OpenStreetMap Nominatim error:', error);
    }
    
    // Fallback 2: Coordinate-based city lookup (Major cities)
    const nearbyCity = findNearbyMajorCity(latitude, longitude);
    if (nearbyCity) {
      console.log(`Major city lookup success: ${latitude}, ${longitude} -> ${nearbyCity}`);
      return res.json({
        results: [],
        city: nearbyCity,
        formatted_address: `Near ${nearbyCity}`,
        status: 'success',
        source: 'lookup'
      });
    }
    
    // Final fallback: Formatted coordinates
    const coordinateCity = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    console.log(`Using coordinate fallback: ${coordinateCity}`);
    
    res.json({
      results: [],
      city: coordinateCity,
      formatted_address: `Location: ${coordinateCity}`,
      status: 'fallback',
      source: 'coordinates'
    });
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ 
      error: 'Geocoding service unavailable',
      city: 'Unknown Location'
    });
  }
});

// Major cities lookup for fallback (expandable)
const findNearbyMajorCity = (lat: number, lng: number): string | null => {
  const majorCities = [
    { name: 'Toronto', lat: 43.6532, lng: -79.3832, radius: 50 },
    { name: 'New York', lat: 40.7128, lng: -74.0060, radius: 50 },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, radius: 60 },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298, radius: 50 },
    { name: 'Miami', lat: 25.7617, lng: -80.1918, radius: 40 },
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194, radius: 40 },
    { name: 'Vancouver', lat: 49.2827, lng: -123.1207, radius: 40 },
    { name: 'Montreal', lat: 45.5017, lng: -73.5673, radius: 40 },
    { name: 'London', lat: 51.5074, lng: -0.1278, radius: 50 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522, radius: 40 }
  ];
  
  for (const city of majorCities) {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    if (distance <= city.radius) {
      return city.name;
    }
  }
  
  return null;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

export default router;
import { Router } from "express";
import axios from "axios";

const router = Router();

// Reverse geocode coordinates to address
router.get("/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ 
        error: "Latitude and longitude are required" 
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        error: "Invalid latitude or longitude" 
      });
    }

    // Use Google Geocoding API if available
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`,
          { timeout: 5000 }
        );

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const result = response.data.results[0];
          const components = result.address_components;
          
          // Extract city and country from address components
          let city = 'Unknown';
          let country = 'Unknown';
          
          for (const component of components) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            } else if (component.types.includes('country')) {
              country = component.long_name;
            }
          }

          return res.json({
            formatted_address: result.formatted_address,
            city: city,
            country: country
          });
        }
      } catch (error) {
        console.error('Google Geocoding API error:', error);
      }
    }

    // Fallback response
    res.json({
      formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      city: 'Unknown',
      country: 'Unknown'
    });

  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    res.status(500).json({ 
      error: "Failed to reverse geocode coordinates" 
    });
  }
});

export default router;
