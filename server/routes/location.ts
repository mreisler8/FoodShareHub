
import { Router } from "express";
import { z } from "zod";

const router = Router();

// Popular cities database
const popularCities = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
  'Boston, MA', 'Nashville, TN', 'Oklahoma City, OK', 'Las Vegas, NV', 'Portland, OR',
  'Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Calgary, AB', 'Ottawa, ON',
  'Edmonton, AB', 'Mississauga, ON', 'Winnipeg, MB', 'Quebec City, QC', 'Hamilton, ON'
];

// Get city suggestions
router.get('/cities', async (req, res) => {
  try {
    const query = z.string().min(2).max(50).parse(req.query.q);
    
    const suggestions = popularCities
      .filter(city => city.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
    
    res.json({ cities: suggestions });
  } catch (error) {
    console.error('City suggestions error:', error);
    res.status(400).json({ error: 'Invalid query parameter' });
  }
});

// Reverse geocoding (simplified - in production, use Google Maps or similar)
router.get('/reverse', async (req, res) => {
  try {
    const lat = z.number().parse(parseFloat(req.query.lat as string));
    const lng = z.number().parse(parseFloat(req.query.lng as string));
    
    // In a real implementation, use Google Maps Geocoding API
    // For now, return a simplified response
    res.json({
      address: 'Location found',
      city: 'Unknown City',
      country: 'Unknown Country'
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(400).json({ error: 'Invalid coordinates' });
  }
});

export default router;
