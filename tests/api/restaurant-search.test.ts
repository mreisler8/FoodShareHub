import request from 'supertest';
import { app } from '../../server/index';
import { db } from '../../server/db';

describe('Restaurant Search API', () => {
  beforeEach(async () => {
    // Set up test database state
    await db.delete().from('restaurants');
    await db.delete().from('users');
    
    // Create test user
    await db.insert().into('users').values({
      id: 1,
      username: 'testuser',
      name: 'Test User',
      password: 'hashedpassword'
    });
  });

  describe('GET /api/restaurants/search', () => {
    it('should return restaurants matching search query', async () => {
      // Given: Restaurants in database
      await db.insert().into('restaurants').values([
        { id: 1, name: 'Italian Bistro', location: 'Downtown', cuisine: 'Italian' },
        { id: 2, name: 'Pizza Palace', location: 'Midtown', cuisine: 'Italian' },
        { id: 3, name: 'Sushi Bar', location: 'Downtown', cuisine: 'Japanese' }
      ]);

      // When: User searches for "Italian"
      const response = await request(app)
        .get('/api/restaurants/search?q=Italian')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Italian restaurants are returned
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Italian Bistro');
      expect(response.body[1].name).toBe('Pizza Palace');
    });

    it('should handle empty search query', async () => {
      // When: User searches with empty query
      const response = await request(app)
        .get('/api/restaurants/search?q=')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Empty results are returned
      expect(response.body).toHaveLength(0);
    });

    it('should integrate with Google Places API for unknown restaurants', async () => {
      // Given: Restaurant not in local database
      // When: User searches for unknown restaurant
      const response = await request(app)
        .get('/api/restaurants/search?q=Unknown Restaurant')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Google Places results are returned
      // TODO: Mock Google Places API response
      expect(response.body).toBeDefined();
    });

    it('should require authentication', async () => {
      // When: Unauthenticated user searches
      const response = await request(app)
        .get('/api/restaurants/search?q=Italian')
        .expect(401);

      // Then: Unauthorized error is returned
      expect(response.body.error).toBe('Not authenticated');
    });

    it('should handle search with location filter', async () => {
      // Given: Restaurants in different locations
      await db.insert().into('restaurants').values([
        { id: 1, name: 'Downtown Cafe', location: 'Downtown', cuisine: 'American' },
        { id: 2, name: 'Midtown Diner', location: 'Midtown', cuisine: 'American' }
      ]);

      // When: User searches with location filter
      const response = await request(app)
        .get('/api/restaurants/search?q=Cafe&location=Downtown')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Only downtown restaurants are returned
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Downtown Cafe');
    });

    it('should handle search with cuisine filter', async () => {
      // Given: Restaurants with different cuisines
      await db.insert().into('restaurants').values([
        { id: 1, name: 'Italian Place', location: 'Downtown', cuisine: 'Italian' },
        { id: 2, name: 'Mexican Spot', location: 'Downtown', cuisine: 'Mexican' }
      ]);

      // When: User searches with cuisine filter
      const response = await request(app)
        .get('/api/restaurants/search?q=Place&cuisine=Italian')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Only Italian restaurants are returned
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Italian Place');
    });

    it('should handle search result pagination', async () => {
      // Given: Many restaurants
      const restaurants = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Restaurant ${i + 1}`,
        location: 'Downtown',
        cuisine: 'Italian'
      }));
      await db.insert().into('restaurants').values(restaurants);

      // When: User searches with pagination
      const response = await request(app)
        .get('/api/restaurants/search?q=Restaurant&limit=10&offset=0')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Paginated results are returned
      expect(response.body).toHaveLength(10);
      expect(response.body[0].name).toBe('Restaurant 1');
    });
  });

  describe('GET /api/restaurants/:id', () => {
    it('should return restaurant details', async () => {
      // Given: Restaurant exists
      await db.insert().into('restaurants').values({
        id: 1,
        name: 'Test Restaurant',
        location: 'Downtown',
        cuisine: 'Italian',
        description: 'Great Italian food'
      });

      // When: User requests restaurant details
      const response = await request(app)
        .get('/api/restaurants/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Restaurant details are returned
      expect(response.body.name).toBe('Test Restaurant');
      expect(response.body.location).toBe('Downtown');
      expect(response.body.cuisine).toBe('Italian');
    });

    it('should return 404 for non-existent restaurant', async () => {
      // When: User requests non-existent restaurant
      const response = await request(app)
        .get('/api/restaurants/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      // Then: Not found error is returned
      expect(response.body.error).toBe('Restaurant not found');
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete().from('restaurants');
    await db.delete().from('users');
  });
});