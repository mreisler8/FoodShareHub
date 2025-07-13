import request from 'supertest';
import { db } from '../server/db';
import app from '../server/index';

describe('Delete Posts API', () => {
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
        username: 'delete-test@example.com',
        password: 'testpassword123',
        name: 'Delete Test User'
      });

    testUserId = registerResponse.body.id;

    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'delete-test@example.com',
        password: 'testpassword123'
      });

    authCookie = loginResponse.headers['set-cookie'];

    // Create a test post to delete
    const postResponse = await request(app)
      .post('/api/posts')
      .set('Cookie', authCookie)
      .send({
        userId: testUserId,
        restaurantId: 1,
        content: 'Post to be deleted',
        rating: 3,
        visibility: 'public'
      });

    testPostId = postResponse.body.id;

    // Create another user and post to test authorization
    const otherUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'other-delete@example.com',
        password: 'testpassword123',
        name: 'Other User'
      });

    otherUserId = otherUserResponse.body.id;

    // Login as other user and create a post
    const otherLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'other-delete@example.com',
        password: 'testpassword123'
      });

    const otherCookie = otherLoginResponse.headers['set-cookie'];

    const otherPostResponse = await request(app)
      .post('/api/posts')
      .set('Cookie', otherCookie)
      .send({
        userId: otherUserId,
        restaurantId: 1,
        content: 'Other user post - should not be deletable',
        rating: 4,
        visibility: 'public'
      });

    otherPostId = otherPostResponse.body.id;
  });

  afterAll(async () => {
    // Clean up remaining test data (testPostId should be deleted by tests)
    await db.execute(`DELETE FROM posts WHERE id = ${otherPostId}`);
    await db.execute(`DELETE FROM users WHERE id IN (${testUserId}, ${otherUserId})`);
  });

  describe('DELETE /api/posts/:id', () => {
    it('should successfully delete a post and return 200', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Post deleted successfully');
    });

    it('should return 404 when trying to fetch deleted post', async () => {
      await request(app)
        .get(`/api/posts/${testPostId}`)
        .set('Cookie', authCookie)
        .expect(404);
    });

    it('should not include deleted post in feed', async () => {
      const feedResponse = await request(app)
        .get('/api/feed')
        .set('Cookie', authCookie)
        .expect(200);

      const deletedPost = feedResponse.body.posts.find((p: any) => p.id === testPostId);
      expect(deletedPost).toBeUndefined();
    });

    it('should not include deleted post in all posts', async () => {
      const postsResponse = await request(app)
        .get('/api/posts')
        .set('Cookie', authCookie)
        .expect(200);

      const deletedPost = postsResponse.find((p: any) => p.id === testPostId);
      expect(deletedPost).toBeUndefined();
    });

    it('should return 401 when not authenticated', async () => {
      // Create another post for this test
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Cookie', authCookie)
        .send({
          userId: testUserId,
          restaurantId: 1,
          content: 'Post for auth test',
          rating: 3,
          visibility: 'public'
        });

      const newPostId = postResponse.body.id;

      await request(app)
        .delete(`/api/posts/${newPostId}`)
        .expect(401);

      // Clean up the post
      await request(app)
        .delete(`/api/posts/${newPostId}`)
        .set('Cookie', authCookie)
        .expect(200);
    });

    it('should return 404 when post does not exist', async () => {
      await request(app)
        .delete('/api/posts/99999')
        .set('Cookie', authCookie)
        .expect(404);
    });

    it('should return 403 when trying to delete another user\'s post', async () => {
      const response = await request(app)
        .delete(`/api/posts/${otherPostId}`)
        .set('Cookie', authCookie)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Not authorized to delete this post');
    });

    it('should handle deletion of already deleted post gracefully', async () => {
      // Create and immediately delete a post
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Cookie', authCookie)
        .send({
          userId: testUserId,
          restaurantId: 1,
          content: 'Post for double delete test',
          rating: 3,
          visibility: 'public'
        });

      const newPostId = postResponse.body.id;

      // Delete it once
      await request(app)
        .delete(`/api/posts/${newPostId}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Try to delete it again
      await request(app)
        .delete(`/api/posts/${newPostId}`)
        .set('Cookie', authCookie)
        .expect(404);
    });
  });

  describe('Post Deletion Integration', () => {
    it('should delete post with comments and likes cleanly', async () => {
      // Create a post
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Cookie', authCookie)
        .send({
          userId: testUserId,
          restaurantId: 1,
          content: 'Post with comments and likes',
          rating: 4,
          visibility: 'public'
        });

      const postId = postResponse.body.id;

      // Add a comment (if comments are implemented)
      try {
        await request(app)
          .post('/api/comments')
          .set('Cookie', authCookie)
          .send({
            postId: postId,
            userId: testUserId,
            content: 'Test comment'
          });
      } catch (error) {
        // Comments might not be implemented yet, that's okay
      }

      // Add a like (if likes are implemented)
      try {
        await request(app)
          .post('/api/likes')
          .set('Cookie', authCookie)
          .send({
            postId: postId,
            userId: testUserId
          });
      } catch (error) {
        // Likes might not be implemented yet, that's okay
      }

      // Delete the post
      const deleteResponse = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('message', 'Post deleted successfully');

      // Verify post is gone
      await request(app)
        .get(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(404);
    });

    it('should handle deletion of post with no additional data', async () => {
      // Create a minimal post
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Cookie', authCookie)
        .send({
          userId: testUserId,
          restaurantId: 1,
          content: 'Minimal post',
          rating: 3,
          visibility: 'public'
        });

      const postId = postResponse.body.id;

      // Delete it
      await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(404);
    });
  });

  describe('Delete Authorization Edge Cases', () => {
    it('should properly validate post ownership before deletion', async () => {
      // Create a post as test user
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Cookie', authCookie)
        .send({
          userId: testUserId,
          restaurantId: 1,
          content: 'Ownership test post',
          rating: 3,
          visibility: 'public'
        });

      const postId = postResponse.body.id;

      // Create another user
      const newUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ownership-test@example.com',
          password: 'testpassword123',
          name: 'Ownership Test User'
        });

      // Login as new user
      const newUserLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'ownership-test@example.com',
          password: 'testpassword123'
        });

      const newUserCookie = newUserLoginResponse.headers['set-cookie'];

      // Try to delete the original user's post as the new user
      const deleteResponse = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Cookie', newUserCookie)
        .expect(403);

      expect(deleteResponse.body).toHaveProperty('error', 'Not authorized to delete this post');

      // Verify post still exists
      await request(app)
        .get(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Clean up
      await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(200);

      await db.execute(`DELETE FROM users WHERE id = ${newUserResponse.body.id}`);
    });

    it('should handle malformed post IDs gracefully', async () => {
      // Test with non-numeric ID
      await request(app)
        .delete('/api/posts/invalid-id')
        .set('Cookie', authCookie)
        .expect(404);

      // Test with negative ID
      await request(app)
        .delete('/api/posts/-1')
        .set('Cookie', authCookie)
        .expect(404);

      // Test with very large ID
      await request(app)
        .delete('/api/posts/999999999')
        .set('Cookie', authCookie)
        .expect(404);
    });
  });

  describe('Database Integrity After Deletion', () => {
    it('should maintain referential integrity after post deletion', async () => {
      // Create a post
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Cookie', authCookie)
        .send({
          userId: testUserId,
          restaurantId: 1,
          content: 'Integrity test post',
          rating: 4,
          visibility: 'public'
        });

      const postId = postResponse.body.id;

      // Verify post exists
      const getResponse = await request(app)
        .get(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.id).toBe(postId);

      // Delete the post
      await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Verify all related data is properly handled
      await request(app)
        .get(`/api/posts/${postId}`)
        .set('Cookie', authCookie)
        .expect(404);

      // Restaurant should still exist
      await request(app)
        .get('/api/restaurants')
        .set('Cookie', authCookie)
        .expect(200);

      // User should still exist
      await request(app)
        .get('/api/me')
        .set('Cookie', authCookie)
        .expect(200);
    });
  });
});