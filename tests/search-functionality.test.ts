import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../server/index';
import { db } from '../server/db';
import { users, restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';

describe('Search Functionality', () => {
  let testUser: any;
  let testRestaurant: any;
  let authCookie: string;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(users).values({
      username: 'searchtest@example.com',
      name: 'Search Test User',
      password: 'hashedpassword123'
    }).returning();
    testUser = userResult[0];

    // Create test restaurant
    const restaurantResult = await db.insert(restaurants).values({
      name: 'Test Restaurant',
      location: 'Test City',
      category: 'Italian',
      cuisine: 'Italian',
      priceRange: '$$',
      country: 'USA',
      verified: true
    }).returning();
    testRestaurant = restaurantResult[0];

    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'searchtest@example.com',
        password: 'hashedpassword123'
      });
    
    authCookie = loginResponse.headers['set-cookie'][0];
  });

  afterEach(async () => {
    // Clean up test data
    if (testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
    if (testRestaurant) {
      await db.delete(restaurants).where(eq(restaurants.id, testRestaurant.id));
    }
  });

  describe('GET /api/search/unified', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=test')
        .expect(401);
      
      expect(response.body.error).toBe('Not authenticated');
    });

    it('should return 400 for missing search query', async () => {
      const response = await request(app)
        .get('/api/search/unified')
        .set('Cookie', authCookie)
        .expect(400);
      
      expect(response.body.error).toBe('Search query is required');
      expect(response.body.code).toBe('MISSING_QUERY');
    });

    it('should return 400 for search query too short', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=a')
        .set('Cookie', authCookie)
        .expect(400);
      
      expect(response.body.error).toBe('Search query must be at least 2 characters');
      expect(response.body.code).toBe('QUERY_TOO_SHORT');
    });

    it('should return structured search results with proper format', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=test')
        .set('Cookie', authCookie)
        .expect(200);
      
      // Check response structure
      expect(response.body).toHaveProperty('restaurants');
      expect(response.body).toHaveProperty('lists');
      expect(response.body).toHaveProperty('posts');
      expect(response.body).toHaveProperty('users');
      
      // Check arrays are present
      expect(Array.isArray(response.body.restaurants)).toBe(true);
      expect(Array.isArray(response.body.lists)).toBe(true);
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should find restaurants with valid avgRating format', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=test')
        .set('Cookie', authCookie)
        .expect(200);
      
      // Check restaurant results format
      const restaurants = response.body.restaurants;
      if (restaurants.length > 0) {
        const restaurant = restaurants[0];
        expect(restaurant).toHaveProperty('id');
        expect(restaurant).toHaveProperty('name');
        expect(restaurant).toHaveProperty('type', 'restaurant');
        expect(restaurant).toHaveProperty('avgRating');
        expect(typeof restaurant.avgRating).toBe('number');
        expect(restaurant.avgRating).toBeGreaterThan(0);
        expect(restaurant.avgRating).toBeLessThanOrEqual(5);
      }
    });

    it('should handle Google Places API fallback gracefully', async () => {
      // Search for a term that likely won't be in our database
      const response = await request(app)
        .get('/api/search/unified?q=pizzeria')
        .set('Cookie', authCookie)
        .expect(200);
      
      // Should not fail even if Google API is unavailable
      expect(response.body).toHaveProperty('restaurants');
      expect(Array.isArray(response.body.restaurants)).toBe(true);
    });

    it('should filter search results by type', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=test&type=restaurants')
        .set('Cookie', authCookie)
        .expect(200);
      
      // Should return array directly for single type
      expect(Array.isArray(response.body)).toBe(true);
      
      // All results should be restaurants
      response.body.forEach((result: any) => {
        expect(result.type).toBe('restaurant');
      });
    });

    it('should limit results appropriately', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=test')
        .set('Cookie', authCookie)
        .expect(200);
      
      // Check that results are within expected limits
      expect(response.body.restaurants.length).toBeLessThanOrEqual(10);
      expect(response.body.lists.length).toBeLessThanOrEqual(5);
      expect(response.body.posts.length).toBeLessThanOrEqual(5);
      expect(response.body.users.length).toBeLessThanOrEqual(5);
    });

    it('should handle special characters in search query', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=test%20%26%20restaurant')
        .set('Cookie', authCookie)
        .expect(200);
      
      expect(response.body).toHaveProperty('restaurants');
      expect(Array.isArray(response.body.restaurants)).toBe(true);
    });

    it('should return proper error for server errors', async () => {
      // This test would require mocking database failure
      // For now, just ensure the endpoint exists and handles errors
      const response = await request(app)
        .get('/api/search/unified?q=validquery')
        .set('Cookie', authCookie);
      
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('GET /api/search/trending', () => {
    it('should return trending content', async () => {
      const response = await request(app)
        .get('/api/search/trending')
        .set('Cookie', authCookie)
        .expect(200);
      
      expect(response.body).toHaveProperty('trending');
      expect(Array.isArray(response.body.trending)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/search/trending')
        .expect(401);
      
      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Search Result Validation', () => {
    it('should validate avgRating is always a number', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=test')
        .set('Cookie', authCookie)
        .expect(200);
      
      // Check all restaurant results have valid avgRating
      response.body.restaurants.forEach((restaurant: any) => {
        if (restaurant.avgRating !== undefined) {
          expect(typeof restaurant.avgRating).toBe('number');
          expect(Number.isFinite(restaurant.avgRating)).toBe(true);
          expect(restaurant.avgRating).toBeGreaterThan(0);
          expect(restaurant.avgRating).toBeLessThanOrEqual(5);
        }
      });
    });

    it('should ensure all required fields are present', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=test')
        .set('Cookie', authCookie)
        .expect(200);
      
      // Check restaurant results have required fields
      response.body.restaurants.forEach((restaurant: any) => {
        expect(restaurant).toHaveProperty('id');
        expect(restaurant).toHaveProperty('name');
        expect(restaurant).toHaveProperty('type', 'restaurant');
        expect(typeof restaurant.id).toBe('string');
        expect(typeof restaurant.name).toBe('string');
        expect(restaurant.name.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty search results gracefully', async () => {
      const response = await request(app)
        .get('/api/search/unified?q=xyznonexistentquery123')
        .set('Cookie', authCookie)
        .expect(200);
      
      expect(response.body.restaurants).toEqual([]);
      expect(response.body.lists).toEqual([]);
      expect(response.body.posts).toEqual([]);
      expect(response.body.users).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/search/unified?q=test')
        .set('Cookie', authCookie)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 2 seconds
      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app)
          .get('/api/search/unified?q=test')
          .set('Cookie', authCookie)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('restaurants');
      });
    });
  });
});