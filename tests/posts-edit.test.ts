import request from 'supertest';
import { db } from '../server/db';
import app from '../server/index';

describe('Edit Posts API', () => {
  let authCookie: string;
  let testUserId: number;
  let testPostId: number;
  let otherUserId: number;
  let otherPostId: number;

  beforeAll(async () => {
    // Create a test user and get authentication
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'edit-test@example.com',
        password: 'testpassword123',
        name: 'Edit Test User'
      });

    testUserId = registerResponse.body.id;

    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'edit-test@example.com',
        password: 'testpassword123'
      });

    authCookie = loginResponse.headers['set-cookie'];

    // Create a test post to edit
    const postResponse = await request(app)
      .post('/api/posts')
      .set('Cookie', authCookie)
      .send({
        userId: testUserId,
        restaurantId: 1,
        content: 'Original post content',
        rating: 3,
        visibility: 'public'
      });

    testPostId = postResponse.body.id;

    // Create another user and post to test authorization
    const otherUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'other-edit@example.com',
        password: 'testpassword123',
        name: 'Other User'
      });

    otherUserId = otherUserResponse.body.id;

    // Login as other user and create a post
    const otherLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'other-edit@example.com',
        password: 'testpassword123'
      });

    const otherCookie = otherLoginResponse.headers['set-cookie'];

    const otherPostResponse = await request(app)
      .post('/api/posts')
      .set('Cookie', otherCookie)
      .send({
        userId: otherUserId,
        restaurantId: 1,
        content: 'Other user post',
        rating: 4,
        visibility: 'public'
      });

    otherPostId = otherPostResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.execute(`DELETE FROM posts WHERE id IN (${testPostId}, ${otherPostId})`);
    await db.execute(`DELETE FROM users WHERE id IN (${testUserId}, ${otherUserId})`);
  });

  describe('PUT /api/posts/:id', () => {
    it('should successfully update a post with new data', async () => {
      const updatedData = {
        content: 'Updated post content with new information',
        rating: 5,
        visibility: 'private',
        priceAssessment: 'Expensive',
        atmosphere: 'Cozy',
        serviceRating: 4
      };

      const response = await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(updatedData)
        .expect(200);

      expect(response.body).toHaveProperty('id', testPostId);
      expect(response.body.content).toBe(updatedData.content);
      expect(response.body.rating).toBe(updatedData.rating);
      expect(response.body.visibility).toBe(updatedData.visibility);
      expect(response.body.priceAssessment).toBe(updatedData.priceAssessment);
      expect(response.body.atmosphere).toBe(updatedData.atmosphere);
      expect(response.body.serviceRating).toBe(updatedData.serviceRating);
    });

    it('should update only specified fields and preserve others', async () => {
      const partialUpdate = {
        rating: 4,
        atmosphere: 'Lively'
      };

      const response = await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.rating).toBe(partialUpdate.rating);
      expect(response.body.atmosphere).toBe(partialUpdate.atmosphere);
      // Content should remain from previous update
      expect(response.body.content).toBe('Updated post content with new information');
    });

    it('should return 401 when not authenticated', async () => {
      const updateData = {
        content: 'Should not work',
        rating: 2
      };

      await request(app)
        .put(`/api/posts/${testPostId}`)
        .send(updateData)
        .expect(401);
    });

    it('should return 404 when post does not exist', async () => {
      const updateData = {
        content: 'Non-existent post',
        rating: 3
      };

      await request(app)
        .put('/api/posts/99999')
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(404);
    });

    it('should return 403 when trying to edit another user\'s post', async () => {
      const updateData = {
        content: 'Trying to edit someone else\'s post',
        rating: 1
      };

      const response = await request(app)
        .put(`/api/posts/${otherPostId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Not authorized to update this post');
    });

    it('should validate rating is within range', async () => {
      const invalidRating = {
        rating: 6, // Invalid rating
        content: 'Test content'
      };

      await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(invalidRating)
        .expect(400);
    });

    it('should handle empty content gracefully', async () => {
      const emptyContent = {
        content: '',
        rating: 3
      };

      await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(emptyContent)
        .expect(400);
    });

    it('should preserve restaurant association when updating', async () => {
      const updateData = {
        content: 'Updated content preserving restaurant',
        rating: 4
      };

      const response = await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.restaurantId).toBe(1); // Original restaurant ID
    });

    it('should update dishes tried array', async () => {
      const updateData = {
        content: 'Updated with new dishes',
        rating: 4,
        dishesTried: ['Pasta Carbonara', 'Caesar Salad', 'Tiramisu']
      };

      const response = await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.dishesTried).toEqual(updateData.dishesTried);
    });

    it('should handle dietary options update', async () => {
      const updateData = {
        content: 'Updated with dietary info',
        rating: 4,
        dietaryOptions: ['Vegetarian', 'Gluten-Free']
      };

      const response = await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.dietaryOptions).toEqual(updateData.dietaryOptions);
    });
  });

  describe('Post Update Integration', () => {
    it('should reflect changes when fetching the updated post', async () => {
      const updateData = {
        content: 'Final integration test content',
        rating: 5,
        visibility: 'public',
        atmosphere: 'Romantic'
      };

      // Update the post
      await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      // Fetch the post and verify changes
      const getResponse = await request(app)
        .get(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.content).toBe(updateData.content);
      expect(getResponse.body.rating).toBe(updateData.rating);
      expect(getResponse.body.visibility).toBe(updateData.visibility);
      expect(getResponse.body.atmosphere).toBe(updateData.atmosphere);
    });

    it('should show updated post in feed after edit', async () => {
      const updateData = {
        content: 'Content that should appear in feed',
        rating: 5
      };

      // Update the post
      await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      // Check if updated post appears in feed
      const feedResponse = await request(app)
        .get('/api/feed')
        .set('Cookie', authCookie)
        .expect(200);

      const updatedPost = feedResponse.body.posts.find((p: any) => p.id === testPostId);
      expect(updatedPost).toBeDefined();
      expect(updatedPost.content).toBe(updateData.content);
      expect(updatedPost.rating).toBe(updateData.rating);
    });
  });

  describe('Edit Validation Edge Cases', () => {
    it('should handle null values appropriately', async () => {
      const updateWithNulls = {
        content: 'Test with nulls',
        rating: 3,
        priceAssessment: null,
        atmosphere: null,
        serviceRating: null
      };

      const response = await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(updateWithNulls)
        .expect(200);

      expect(response.body.priceAssessment).toBeNull();
      expect(response.body.atmosphere).toBeNull();
      expect(response.body.serviceRating).toBeNull();
    });

    it('should handle very long content appropriately', async () => {
      const longContent = 'A'.repeat(2000); // Very long content
      
      const updateData = {
        content: longContent,
        rating: 4
      };

      const response = await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.content).toBe(longContent);
    });
  });
});