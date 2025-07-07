
import request from 'supertest';
import { db } from '../server/db';
import app from '../server/index';

describe('Unified Search API', () => {
  let authCookie: string;

  beforeAll(async () => {
    // Create test user and get auth cookie
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'searchtest@example.com',
        password: 'password123',
        name: 'Search Test User'
      });

    if (registerRes.status === 200) {
      authCookie = registerRes.headers['set-cookie'][0];
    }
  });

  afterAll(async () => {
    // Clean up test data if needed
  });

  describe('GET /api/search/unified', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/search/unified?q=test');
      
      expect(res.status).toBe(401);
    });

    it('should require minimum query length', async () => {
      const res = await request(app)
        .get('/api/search/unified?q=a')
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Search query must be at least 2 characters');
    });

    it('should return proper JSON structure', async () => {
      const res = await request(app)
        .get('/api/search/unified?q=pizza')
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('restaurants');
      expect(res.body).toHaveProperty('lists');
      expect(res.body).toHaveProperty('posts');
      expect(res.body).toHaveProperty('users');
      
      expect(Array.isArray(res.body.restaurants)).toBe(true);
      expect(Array.isArray(res.body.lists)).toBe(true);
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('should limit results to 5 per category', async () => {
      const res = await request(app)
        .get('/api/search/unified?q=test')
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      expect(res.body.restaurants.length).toBeLessThanOrEqual(5);
      expect(res.body.lists.length).toBeLessThanOrEqual(5);
      expect(res.body.posts.length).toBeLessThanOrEqual(5);
      expect(res.body.users.length).toBeLessThanOrEqual(5);
    });

    it('should return proper result format for each type', async () => {
      const res = await request(app)
        .get('/api/search/unified?q=test')
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      
      // Check restaurant result format
      if (res.body.restaurants.length > 0) {
        const restaurant = res.body.restaurants[0];
        expect(restaurant).toHaveProperty('id');
        expect(restaurant).toHaveProperty('name');
        expect(restaurant).toHaveProperty('subtitle');
        expect(restaurant).toHaveProperty('type');
        expect(restaurant.type).toBe('restaurant');
      }
      
      // Check list result format
      if (res.body.lists.length > 0) {
        const list = res.body.lists[0];
        expect(list).toHaveProperty('id');
        expect(list).toHaveProperty('name');
        expect(list).toHaveProperty('subtitle');
        expect(list).toHaveProperty('type');
        expect(list.type).toBe('list');
      }
      
      // Check post result format
      if (res.body.posts.length > 0) {
        const post = res.body.posts[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('name');
        expect(post).toHaveProperty('subtitle');
        expect(post).toHaveProperty('type');
        expect(post.type).toBe('post');
      }
      
      // Check user result format
      if (res.body.users.length > 0) {
        const user = res.body.users[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('subtitle');
        expect(user).toHaveProperty('type');
        expect(user.type).toBe('user');
      }
    });
  });
});
