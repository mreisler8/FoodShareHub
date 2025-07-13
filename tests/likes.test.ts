import request from 'supertest';
import { app } from '../server/index';
import { storage } from '../server/storage';

describe('Likes API - User Story 8: Comments & Likes on Dining Posts', () => {
  let authCookie: string;
  let testUserId: number;
  let testPostId: number;

  beforeAll(async () => {
    // Create test user and log in
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'likestestuser@example.com',
        password: 'testpassword',
        name: 'Likes Test User'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'likestestuser@example.com',
        password: 'testpassword'
      });

    authCookie = loginResponse.headers['set-cookie'][0];
    testUserId = loginResponse.body.id;

    // Create a test restaurant and post
    const restaurant = await storage.createRestaurant({
      name: 'Test Restaurant for Likes',
      location: 'Test Location',
      category: 'Test Category'
    });

    const post = await storage.createPost({
      userId: testUserId,
      restaurantId: restaurant.id,
      content: 'Test post for likes',
      rating: 5,
      visibility: 'public'
    });

    testPostId = post.id;
  });

  describe('POST /api/posts/:postId/likes', () => {
    it('should allow authenticated user to like a post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/likes`)
        .set('Cookie', authCookie)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.postId).toBe(testPostId);
      expect(response.body.userId).toBe(testUserId);
    });

    it('should prevent duplicate likes from same user', async () => {
      await request(app)
        .post(`/api/posts/${testPostId}/likes`)
        .set('Cookie', authCookie)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/posts/${testPostId}/likes`)
        .expect(401);
    });

    it('should handle non-existent post', async () => {
      await request(app)
        .post('/api/posts/99999/likes')
        .set('Cookie', authCookie)
        .expect(500);
    });
  });

  describe('GET /api/posts/:postId/likes', () => {
    it('should return all likes for a post', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPostId}/likes`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('postId', testPostId);
      expect(response.body[0]).toHaveProperty('userId', testUserId);
    });

    it('should return empty array for post with no likes', async () => {
      // Create a new post with no likes
      const newPost = await storage.createPost({
        userId: testUserId,
        restaurantId: 1,
        content: 'Post with no likes',
        rating: 4,
        visibility: 'public'
      });

      const response = await request(app)
        .get(`/api/posts/${newPost.id}/likes`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('DELETE /api/posts/:postId/likes', () => {
    it('should allow user to unlike a post they have liked', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPostId}/likes`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.message).toBe('Like removed successfully');

      // Verify like was removed
      const likesResponse = await request(app)
        .get(`/api/posts/${testPostId}/likes`)
        .expect(200);

      expect(likesResponse.body.length).toBe(0);
    });

    it('should handle unliking a post that is not liked', async () => {
      // Should not error if like doesn't exist
      await request(app)
        .delete(`/api/posts/${testPostId}/likes`)
        .set('Cookie', authCookie)
        .expect(200);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/posts/${testPostId}/likes`)
        .expect(401);
    });
  });

  describe('Like count integration', () => {
    let multiLikePostId: number;
    let secondUserId: number;
    let secondUserCookie: string;

    beforeAll(async () => {
      // Create second test user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'likestestuser2@example.com',
          password: 'testpassword',
          name: 'Second Likes Test User'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'likestestuser2@example.com',
          password: 'testpassword'
        });

      secondUserCookie = loginResponse.headers['set-cookie'][0];
      secondUserId = loginResponse.body.id;

      // Create post for multi-user like testing
      const post = await storage.createPost({
        userId: testUserId,
        restaurantId: 1,
        content: 'Post for multiple likes',
        rating: 5,
        visibility: 'public'
      });

      multiLikePostId = post.id;
    });

    it('should track multiple likes from different users', async () => {
      // First user likes
      await request(app)
        .post(`/api/posts/${multiLikePostId}/likes`)
        .set('Cookie', authCookie)
        .expect(201);

      // Second user likes
      await request(app)
        .post(`/api/posts/${multiLikePostId}/likes`)
        .set('Cookie', secondUserCookie)
        .expect(201);

      // Verify both likes exist
      const response = await request(app)
        .get(`/api/posts/${multiLikePostId}/likes`)
        .expect(200);

      expect(response.body.length).toBe(2);
      const userIds = response.body.map((like: any) => like.userId);
      expect(userIds).toContain(testUserId);
      expect(userIds).toContain(secondUserId);
    });

    it('should maintain correct like count after unlike', async () => {
      // First user unlikes
      await request(app)
        .delete(`/api/posts/${multiLikePostId}/likes`)
        .set('Cookie', authCookie)
        .expect(200);

      // Verify only one like remains
      const response = await request(app)
        .get(`/api/posts/${multiLikePostId}/likes`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].userId).toBe(secondUserId);
    });
  });

  describe('Like state validation', () => {
    it('should correctly identify if user has liked a post', async () => {
      // Create fresh post
      const post = await storage.createPost({
        userId: testUserId,
        restaurantId: 1,
        content: 'Post for like state test',
        rating: 4,
        visibility: 'public'
      });

      // Initially no likes
      let response = await request(app)
        .get(`/api/posts/${post.id}/likes`)
        .expect(200);

      expect(response.body.length).toBe(0);

      // Add like
      await request(app)
        .post(`/api/posts/${post.id}/likes`)
        .set('Cookie', authCookie)
        .expect(201);

      // Verify like exists
      response = await request(app)
        .get(`/api/posts/${post.id}/likes`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].userId).toBe(testUserId);
    });
  });
});