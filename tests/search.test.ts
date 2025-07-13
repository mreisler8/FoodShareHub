import request from 'supertest';
import { db } from '../server/db';
import app from '../server/index';

describe('Restaurant Search API', () => {
  describe('GET /api/search', () => {
    it('should return 400 for search query less than 2 characters', async () => {
      const response = await request(app)
        .get('/api/search?q=a')
        .expect(400);

      expect(response.body).toEqual({
        error: "Search query must be at least 2 characters"
      });
    });

    it('should return empty array when no matches found', async () => {
      const response = await request(app)
        .get('/api/search?q=nonexistentrestaurant')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should search for pizza restaurants and return results', async () => {
      const response = await request(app)
        .get('/api/search?q=pizza')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5); // Max 5 results as per user story
      
      // Check structure of returned results
      if (response.body.length > 0) {
        const firstResult = response.body[0];
        expect(firstResult).toHaveProperty('id');
        expect(firstResult).toHaveProperty('name');
        expect(firstResult).toHaveProperty('thumbnailUrl');
        expect(firstResult).toHaveProperty('avgRating');
        expect(firstResult).toHaveProperty('source');
        expect(['database', 'google']).toContain(firstResult.source);
      }
    });

    it('should handle search for common restaurant names', async () => {
      const response = await request(app)
        .get('/api/search?q=restaurant')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should return 401 when not authenticated', async () => {
      // Create a request without session/authentication
      const response = await request(app)
        .get('/api/search?q=pizza')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});