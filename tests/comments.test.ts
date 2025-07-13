import request from 'supertest';
import { app } from '../server/index';
import { storage } from '../server/storage';

describe('Comments API - User Story 8: Comments & Likes on Dining Posts', () => {
  let authCookie: string;
  let testUserId: number;
  let testPostId: number;
  let secondUserCookie: string;
  let secondUserId: number;

  beforeAll(async () => {
    // Create first test user and log in
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'commentstestuser@example.com',
        password: 'testpassword',
        name: 'Comments Test User'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'commentstestuser@example.com',
        password: 'testpassword'
      });

    authCookie = loginResponse.headers['set-cookie'][0];
    testUserId = loginResponse.body.id;

    // Create second test user
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'commentstestuser2@example.com',
        password: 'testpassword',
        name: 'Second Comments Test User'
      });

    const secondLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'commentstestuser2@example.com',
        password: 'testpassword'
      });

    secondUserCookie = secondLoginResponse.headers['set-cookie'][0];
    secondUserId = secondLoginResponse.body.id;

    // Create a test restaurant and post
    const restaurant = await storage.createRestaurant({
      name: 'Test Restaurant for Comments',
      location: 'Test Location',
      category: 'Test Category'
    });

    const post = await storage.createPost({
      userId: testUserId,
      restaurantId: restaurant.id,
      content: 'Test post for comments',
      rating: 5,
      visibility: 'public'
    });

    testPostId = post.id;
  });

  describe('POST /api/posts/:postId/comments', () => {
    it('should allow authenticated user to add a comment', async () => {
      const commentContent = 'This is a great restaurant!';
      
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: commentContent })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.postId).toBe(testPostId);
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.content).toBe(commentContent);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .send({ content: 'Unauthenticated comment' })
        .expect(401);
    });

    it('should require content', async () => {
      await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', authCookie)
        .send({})
        .expect(400);
    });

    it('should reject empty content', async () => {
      await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: '' })
        .expect(400);
    });

    it('should trim whitespace from content', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: '  Great food!  ' })
        .expect(201);

      expect(response.body.content).toBe('Great food!');
    });

    it('should handle non-existent post', async () => {
      await request(app)
        .post('/api/posts/99999/comments')
        .set('Cookie', authCookie)
        .send({ content: 'Comment on non-existent post' })
        .expect(500);
    });
  });

  describe('GET /api/posts/:postId/comments', () => {
    let commentsPostId: number;

    beforeAll(async () => {
      // Create a dedicated post for comment retrieval tests
      const post = await storage.createPost({
        userId: testUserId,
        restaurantId: 1,
        content: 'Post for comment retrieval tests',
        rating: 4,
        visibility: 'public'
      });
      commentsPostId = post.id;

      // Add multiple comments from different users
      await request(app)
        .post(`/api/posts/${commentsPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: 'First comment from user 1' });

      await request(app)
        .post(`/api/posts/${commentsPostId}/comments`)
        .set('Cookie', secondUserCookie)
        .send({ content: 'Comment from user 2' });

      await request(app)
        .post(`/api/posts/${commentsPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: 'Second comment from user 1' });
    });

    it('should return all comments for a post', async () => {
      const response = await request(app)
        .get(`/api/posts/${commentsPostId}/comments`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      
      // Verify comment structure
      const comment = response.body[0];
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('postId', commentsPostId);
      expect(comment).toHaveProperty('userId');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('createdAt');
    });

    it('should return comments in chronological order', async () => {
      const response = await request(app)
        .get(`/api/posts/${commentsPostId}/comments`)
        .expect(200);

      const comments = response.body;
      expect(comments[0].content).toBe('First comment from user 1');
      expect(comments[1].content).toBe('Comment from user 2');
      expect(comments[2].content).toBe('Second comment from user 1');

      // Verify timestamps are in order
      const timestamp1 = new Date(comments[0].createdAt).getTime();
      const timestamp2 = new Date(comments[1].createdAt).getTime();
      const timestamp3 = new Date(comments[2].createdAt).getTime();
      
      expect(timestamp1).toBeLessThanOrEqual(timestamp2);
      expect(timestamp2).toBeLessThanOrEqual(timestamp3);
    });

    it('should return empty array for post with no comments', async () => {
      const newPost = await storage.createPost({
        userId: testUserId,
        restaurantId: 1,
        content: 'Post with no comments',
        rating: 3,
        visibility: 'public'
      });

      const response = await request(app)
        .get(`/api/posts/${newPost.id}/comments`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should not require authentication to view comments', async () => {
      await request(app)
        .get(`/api/posts/${commentsPostId}/comments`)
        .expect(200);
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    let commentToDelete: any;
    let otherUserComment: any;

    beforeAll(async () => {
      // Create comments to test deletion
      const response1 = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: 'Comment to be deleted' });
      commentToDelete = response1.body;

      const response2 = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', secondUserCookie)
        .send({ content: 'Other user comment' });
      otherUserComment = response2.body;
    });

    it('should allow user to delete their own comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${commentToDelete.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.message).toBe('Comment deleted successfully');

      // Verify comment was deleted
      const commentsResponse = await request(app)
        .get(`/api/posts/${testPostId}/comments`)
        .expect(200);

      const commentIds = commentsResponse.body.map((c: any) => c.id);
      expect(commentIds).not.toContain(commentToDelete.id);
    });

    it('should prevent user from deleting others comments', async () => {
      await request(app)
        .delete(`/api/comments/${otherUserComment.id}`)
        .set('Cookie', authCookie)
        .expect(403);

      // Verify comment still exists
      const commentsResponse = await request(app)
        .get(`/api/posts/${testPostId}/comments`)
        .expect(200);

      const commentIds = commentsResponse.body.map((c: any) => c.id);
      expect(commentIds).toContain(otherUserComment.id);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/comments/${otherUserComment.id}`)
        .expect(401);
    });

    it('should handle non-existent comment', async () => {
      await request(app)
        .delete('/api/comments/99999')
        .set('Cookie', authCookie)
        .expect(404);
    });

    it('should allow comment owner to delete successfully', async () => {
      // Second user deletes their own comment
      await request(app)
        .delete(`/api/comments/${otherUserComment.id}`)
        .set('Cookie', secondUserCookie)
        .expect(200);

      // Verify comment was deleted
      const commentsResponse = await request(app)
        .get(`/api/posts/${testPostId}/comments`)
        .expect(200);

      const commentIds = commentsResponse.body.map((c: any) => c.id);
      expect(commentIds).not.toContain(otherUserComment.id);
    });
  });

  describe('Comment content validation', () => {
    it('should handle long comments', async () => {
      const longContent = 'A'.repeat(1000); // 1000 character comment
      
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: longContent })
        .expect(201);

      expect(response.body.content).toBe(longContent);
    });

    it('should handle special characters in comments', async () => {
      const specialContent = 'Great food! 🍕 Cost was $25.99 & worth it 100%';
      
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: specialContent })
        .expect(201);

      expect(response.body.content).toBe(specialContent);
    });

    it('should handle newlines in comments', async () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: multilineContent })
        .expect(201);

      expect(response.body.content).toBe(multilineContent);
    });
  });

  describe('Comment count integration', () => {
    let countTestPostId: number;

    beforeAll(async () => {
      const post = await storage.createPost({
        userId: testUserId,
        restaurantId: 1,
        content: 'Post for comment count testing',
        rating: 5,
        visibility: 'public'
      });
      countTestPostId = post.id;
    });

    it('should track comment count correctly', async () => {
      // Initially no comments
      let response = await request(app)
        .get(`/api/posts/${countTestPostId}/comments`)
        .expect(200);
      expect(response.body.length).toBe(0);

      // Add first comment
      await request(app)
        .post(`/api/posts/${countTestPostId}/comments`)
        .set('Cookie', authCookie)
        .send({ content: 'First comment for count test' });

      response = await request(app)
        .get(`/api/posts/${countTestPostId}/comments`)
        .expect(200);
      expect(response.body.length).toBe(1);

      // Add second comment
      await request(app)
        .post(`/api/posts/${countTestPostId}/comments`)
        .set('Cookie', secondUserCookie)
        .send({ content: 'Second comment for count test' });

      response = await request(app)
        .get(`/api/posts/${countTestPostId}/comments`)
        .expect(200);
      expect(response.body.length).toBe(2);

      // Delete one comment
      const commentToDelete = response.body[0];
      await request(app)
        .delete(`/api/comments/${commentToDelete.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      response = await request(app)
        .get(`/api/posts/${countTestPostId}/comments`)
        .expect(200);
      expect(response.body.length).toBe(1);
    });
  });
});