import request from 'supertest';
import { app } from '../../server/index';
import { db } from '../../server/db';

describe('Post Operations API', () => {
  let userId: number;
  let restaurantId: number;

  beforeEach(async () => {
    // Set up test database state
    await db.delete().from('posts');
    await db.delete().from('restaurants');
    await db.delete().from('users');
    
    // Create test user
    const user = await db.insert().into('users').values({
      username: 'testuser',
      name: 'Test User',
      password: 'hashedpassword'
    }).returning('*');
    userId = user[0].id;

    // Create test restaurant
    const restaurant = await db.insert().into('restaurants').values({
      name: 'Test Restaurant',
      location: 'Downtown',
      cuisine: 'Italian'
    }).returning('*');
    restaurantId = restaurant[0].id;
  });

  describe('POST /api/posts', () => {
    it('should create new post', async () => {
      // Given: Valid post data
      const postData = {
        content: 'Amazing Italian food! The pasta was perfectly cooked.',
        rating: 5,
        restaurantId: restaurantId,
        visibility: 'public'
      };

      // When: User creates post
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(201);

      // Then: Post is created
      expect(response.body.content).toBe('Amazing Italian food! The pasta was perfectly cooked.');
      expect(response.body.rating).toBe(5);
      expect(response.body.restaurantId).toBe(restaurantId);
      expect(response.body.visibility).toBe('public');
      expect(response.body.userId).toBe(userId);
    });

    it('should validate required fields', async () => {
      // Given: Invalid post data (missing content)
      const postData = {
        rating: 5,
        restaurantId: restaurantId
      };

      // When: User tries to create post
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(400);

      // Then: Validation error is returned
      expect(response.body.error).toContain('content');
    });

    it('should validate rating range', async () => {
      // Given: Invalid rating
      const postData = {
        content: 'Test content',
        rating: 6, // Invalid rating (should be 1-5)
        restaurantId: restaurantId
      };

      // When: User tries to create post
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(400);

      // Then: Validation error is returned
      expect(response.body.error).toContain('rating');
    });

    it('should verify restaurant exists', async () => {
      // Given: Non-existent restaurant
      const postData = {
        content: 'Test content',
        rating: 5,
        restaurantId: 999 // Non-existent restaurant
      };

      // When: User tries to create post
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(404);

      // Then: Restaurant not found error is returned
      expect(response.body.error).toBe('Restaurant not found');
    });

    it('should handle photo uploads', async () => {
      // Given: Post with photos
      const postData = {
        content: 'Great food with photos!',
        rating: 5,
        restaurantId: restaurantId,
        photos: ['photo1.jpg', 'photo2.jpg']
      };

      // When: User creates post with photos
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(201);

      // Then: Post is created with photos
      expect(response.body.photos).toHaveLength(2);
      expect(response.body.photos).toContain('photo1.jpg');
      expect(response.body.photos).toContain('photo2.jpg');
    });
  });

  describe('GET /api/posts', () => {
    it('should return user feed', async () => {
      // Given: Posts exist
      await db.insert().into('posts').values([
        { 
          content: 'Post 1', 
          rating: 5, 
          userId: userId, 
          restaurantId: restaurantId,
          visibility: 'public' 
        },
        { 
          content: 'Post 2', 
          rating: 4, 
          userId: userId, 
          restaurantId: restaurantId,
          visibility: 'public' 
        }
      ]);

      // When: User requests feed
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Posts are returned
      expect(response.body.posts).toHaveLength(2);
      expect(response.body.posts[0].content).toBe('Post 1');
      expect(response.body.posts[1].content).toBe('Post 2');
    });

    it('should support pagination', async () => {
      // Given: Many posts
      const posts = Array.from({ length: 15 }, (_, i) => ({
        content: `Post ${i + 1}`,
        rating: 5,
        userId: userId,
        restaurantId: restaurantId,
        visibility: 'public'
      }));
      await db.insert().into('posts').values(posts);

      // When: User requests paginated posts
      const response = await request(app)
        .get('/api/posts?limit=10&offset=0')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Paginated results are returned
      expect(response.body.posts).toHaveLength(10);
      expect(response.body.pagination.total).toBe(15);
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should filter by visibility', async () => {
      // Given: Posts with different visibility
      await db.insert().into('posts').values([
        { 
          content: 'Private Post', 
          rating: 5, 
          userId: userId, 
          restaurantId: restaurantId,
          visibility: 'private' 
        },
        { 
          content: 'Public Post', 
          rating: 4, 
          userId: userId, 
          restaurantId: restaurantId,
          visibility: 'public' 
        }
      ]);

      // When: User requests public posts only
      const response = await request(app)
        .get('/api/posts?visibility=public')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Only public posts are returned
      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].content).toBe('Public Post');
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should return post details', async () => {
      // Given: Post exists
      const post = await db.insert().into('posts').values({
        content: 'Test post content',
        rating: 5,
        userId: userId,
        restaurantId: restaurantId,
        visibility: 'public'
      }).returning('*');

      // When: User requests post details
      const response = await request(app)
        .get(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Post details are returned
      expect(response.body.content).toBe('Test post content');
      expect(response.body.rating).toBe(5);
      expect(response.body.userId).toBe(userId);
    });

    it('should return 404 for non-existent post', async () => {
      // When: User requests non-existent post
      const response = await request(app)
        .get('/api/posts/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      // Then: Not found error is returned
      expect(response.body.error).toBe('Post not found');
    });

    it('should check post visibility permissions', async () => {
      // Given: Private post owned by another user
      const anotherUser = await db.insert().into('users').values({
        username: 'anotheruser',
        name: 'Another User',
        password: 'hashedpassword'
      }).returning('*');

      const post = await db.insert().into('posts').values({
        content: 'Private post',
        rating: 5,
        userId: anotherUser[0].id,
        restaurantId: restaurantId,
        visibility: 'private'
      }).returning('*');

      // When: User tries to access private post
      const response = await request(app)
        .get(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      // Then: Forbidden error is returned
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('should update post', async () => {
      // Given: User owns a post
      const post = await db.insert().into('posts').values({
        content: 'Original content',
        rating: 4,
        userId: userId,
        restaurantId: restaurantId,
        visibility: 'public'
      }).returning('*');

      // When: User updates post
      const response = await request(app)
        .put(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ 
          content: 'Updated content',
          rating: 5,
          visibility: 'private'
        })
        .expect(200);

      // Then: Post is updated
      expect(response.body.content).toBe('Updated content');
      expect(response.body.rating).toBe(5);
      expect(response.body.visibility).toBe('private');
    });

    it('should check ownership before updating', async () => {
      // Given: Post owned by another user
      const anotherUser = await db.insert().into('users').values({
        username: 'anotheruser',
        name: 'Another User',
        password: 'hashedpassword'
      }).returning('*');

      const post = await db.insert().into('posts').values({
        content: 'Other user post',
        rating: 5,
        userId: anotherUser[0].id,
        restaurantId: restaurantId,
        visibility: 'public'
      }).returning('*');

      // When: User tries to update other user's post
      const response = await request(app)
        .put(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Hacked content' })
        .expect(403);

      // Then: Forbidden error is returned
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete post', async () => {
      // Given: User owns a post
      const post = await db.insert().into('posts').values({
        content: 'Post to delete',
        rating: 5,
        userId: userId,
        restaurantId: restaurantId,
        visibility: 'public'
      }).returning('*');

      // When: User deletes post
      const response = await request(app)
        .delete(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Post is deleted
      expect(response.body.success).toBe(true);

      // And: Post no longer exists
      const getResponse = await request(app)
        .get(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });

    it('should check ownership before deleting', async () => {
      // Given: Post owned by another user
      const anotherUser = await db.insert().into('users').values({
        username: 'anotheruser',
        name: 'Another User',
        password: 'hashedpassword'
      }).returning('*');

      const post = await db.insert().into('posts').values({
        content: 'Other user post',
        rating: 5,
        userId: anotherUser[0].id,
        restaurantId: restaurantId,
        visibility: 'public'
      }).returning('*');

      // When: User tries to delete other user's post
      const response = await request(app)
        .delete(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      // Then: Forbidden error is returned
      expect(response.body.error).toBe('Access denied');
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete().from('posts');
    await db.delete().from('restaurants');
    await db.delete().from('users');
  });
});