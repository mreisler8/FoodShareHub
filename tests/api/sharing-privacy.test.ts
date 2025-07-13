import request from 'supertest';
import { app } from '../../server/index';
import { db } from '../../server/db';

describe('Sharing and Privacy API', () => {
  let userId: number;
  let otherUserId: number;
  let circleId: number;

  beforeEach(async () => {
    // Set up test database state
    await db.delete().from('circle_members');
    await db.delete().from('circles');
    await db.delete().from('restaurant_lists');
    await db.delete().from('posts');
    await db.delete().from('users');
    
    // Create test users
    const user = await db.insert().into('users').values({
      username: 'testuser',
      name: 'Test User',
      password: 'hashedpassword'
    }).returning('*');
    userId = user[0].id;

    const otherUser = await db.insert().into('users').values({
      username: 'otheruser',
      name: 'Other User',
      password: 'hashedpassword'
    }).returning('*');
    otherUserId = otherUser[0].id;

    // Create test circle
    const circle = await db.insert().into('circles').values({
      name: 'Test Circle',
      description: 'Test circle for sharing',
      creatorId: userId,
      isPrivate: false
    }).returning('*');
    circleId = circle[0].id;

    // Add users to circle
    await db.insert().into('circle_members').values([
      { circleId: circleId, userId: userId, role: 'admin' },
      { circleId: circleId, userId: otherUserId, role: 'member' }
    ]);
  });

  describe('List Privacy Controls', () => {
    it('should create private list', async () => {
      // Given: User creates private list
      const listData = {
        name: 'Private List',
        description: 'This is a private list',
        visibility: 'private'
      };

      // When: User creates list
      const response = await request(app)
        .post('/api/lists')
        .set('Authorization', 'Bearer valid-token')
        .send(listData)
        .expect(201);

      // Then: List is created as private
      expect(response.body.visibility).toBe('private');
      expect(response.body.isPublic).toBe(false);
      expect(response.body.shareWithCircle).toBe(false);
    });

    it('should create circle-shared list', async () => {
      // Given: User creates circle-shared list
      const listData = {
        name: 'Circle Shared List',
        description: 'Shared with my circle',
        visibility: 'circle',
        circleId: circleId
      };

      // When: User creates list
      const response = await request(app)
        .post('/api/lists')
        .set('Authorization', 'Bearer valid-token')
        .send(listData)
        .expect(201);

      // Then: List is created as circle-shared
      expect(response.body.visibility).toBe('circle');
      expect(response.body.circleId).toBe(circleId);
      expect(response.body.shareWithCircle).toBe(true);
    });

    it('should create public list', async () => {
      // Given: User creates public list
      const listData = {
        name: 'Public List',
        description: 'Everyone can see this',
        visibility: 'public'
      };

      // When: User creates list
      const response = await request(app)
        .post('/api/lists')
        .set('Authorization', 'Bearer valid-token')
        .send(listData)
        .expect(201);

      // Then: List is created as public
      expect(response.body.visibility).toBe('public');
      expect(response.body.isPublic).toBe(true);
      expect(response.body.makePublic).toBe(true);
    });

    it('should enforce privacy settings mutual exclusivity', async () => {
      // Given: User tries to create list with conflicting privacy settings
      const listData = {
        name: 'Conflicting List',
        visibility: 'public',
        shareWithCircle: true,
        makePublic: true
      };

      // When: User creates list
      const response = await request(app)
        .post('/api/lists')
        .set('Authorization', 'Bearer valid-token')
        .send(listData)
        .expect(400);

      // Then: Validation error is returned
      expect(response.body.error).toContain('Choose one sharing option');
    });
  });

  describe('List Access Control', () => {
    it('should allow access to public lists', async () => {
      // Given: Public list exists
      const list = await db.insert().into('restaurant_lists').values({
        name: 'Public List',
        createdById: userId,
        visibility: 'public',
        isPublic: true
      }).returning('*');

      // When: Another user accesses public list
      const response = await request(app)
        .get(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(200);

      // Then: List is accessible
      expect(response.body.name).toBe('Public List');
    });

    it('should allow circle members to access circle-shared lists', async () => {
      // Given: Circle-shared list exists
      const list = await db.insert().into('restaurant_lists').values({
        name: 'Circle List',
        createdById: userId,
        visibility: 'circle',
        circleId: circleId
      }).returning('*');

      // When: Circle member accesses list
      const response = await request(app)
        .get(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(200);

      // Then: List is accessible
      expect(response.body.name).toBe('Circle List');
    });

    it('should deny access to private lists', async () => {
      // Given: Private list exists
      const list = await db.insert().into('restaurant_lists').values({
        name: 'Private List',
        createdById: userId,
        visibility: 'private'
      }).returning('*');

      // When: Another user tries to access private list
      const response = await request(app)
        .get(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(403);

      // Then: Access is denied
      expect(response.body.error).toBe('Access denied');
    });

    it('should deny non-circle members access to circle-shared lists', async () => {
      // Given: User not in circle
      const nonCircleUser = await db.insert().into('users').values({
        username: 'noncircleuser',
        name: 'Non Circle User',
        password: 'hashedpassword'
      }).returning('*');

      // And: Circle-shared list exists
      const list = await db.insert().into('restaurant_lists').values({
        name: 'Circle List',
        createdById: userId,
        visibility: 'circle',
        circleId: circleId
      }).returning('*');

      // When: Non-circle member tries to access list
      const response = await request(app)
        .get(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer non-circle-user-token')
        .expect(403);

      // Then: Access is denied
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('Post Privacy Controls', () => {
    it('should create private post', async () => {
      // Given: User creates private post
      const postData = {
        content: 'Private dining experience',
        rating: 5,
        restaurantId: 1,
        visibility: 'private'
      };

      // When: User creates post
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(201);

      // Then: Post is created as private
      expect(response.body.visibility).toBe('private');
    });

    it('should create circle-only post', async () => {
      // Given: User creates circle-only post
      const postData = {
        content: 'Circle dining experience',
        rating: 5,
        restaurantId: 1,
        visibility: 'circle',
        circleId: circleId
      };

      // When: User creates post
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(201);

      // Then: Post is created as circle-only
      expect(response.body.visibility).toBe('circle');
      expect(response.body.circleId).toBe(circleId);
    });

    it('should create public post', async () => {
      // Given: User creates public post
      const postData = {
        content: 'Public dining experience',
        rating: 5,
        restaurantId: 1,
        visibility: 'public'
      };

      // When: User creates post
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(201);

      // Then: Post is created as public
      expect(response.body.visibility).toBe('public');
    });
  });

  describe('Post Access Control', () => {
    it('should allow access to public posts', async () => {
      // Given: Public post exists
      const post = await db.insert().into('posts').values({
        content: 'Public post',
        rating: 5,
        userId: userId,
        restaurantId: 1,
        visibility: 'public'
      }).returning('*');

      // When: Another user accesses public post
      const response = await request(app)
        .get(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(200);

      // Then: Post is accessible
      expect(response.body.content).toBe('Public post');
    });

    it('should allow circle members to access circle-only posts', async () => {
      // Given: Circle-only post exists
      const post = await db.insert().into('posts').values({
        content: 'Circle post',
        rating: 5,
        userId: userId,
        restaurantId: 1,
        visibility: 'circle',
        circleId: circleId
      }).returning('*');

      // When: Circle member accesses post
      const response = await request(app)
        .get(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(200);

      // Then: Post is accessible
      expect(response.body.content).toBe('Circle post');
    });

    it('should deny access to private posts', async () => {
      // Given: Private post exists
      const post = await db.insert().into('posts').values({
        content: 'Private post',
        rating: 5,
        userId: userId,
        restaurantId: 1,
        visibility: 'private'
      }).returning('*');

      // When: Another user tries to access private post
      const response = await request(app)
        .get(`/api/posts/${post[0].id}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(403);

      // Then: Access is denied
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('Sharing URL Generation', () => {
    it('should generate public sharing URL for public lists', async () => {
      // Given: Public list exists
      const list = await db.insert().into('restaurant_lists').values({
        name: 'Public List',
        createdById: userId,
        visibility: 'public',
        isPublic: true
      }).returning('*');

      // When: User requests sharing URL
      const response = await request(app)
        .get(`/api/lists/${list[0].id}/share-url`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Public sharing URL is returned
      expect(response.body.shareUrl).toContain(`/lists/${list[0].id}`);
      expect(response.body.isPublic).toBe(true);
    });

    it('should not generate sharing URL for private lists', async () => {
      // Given: Private list exists
      const list = await db.insert().into('restaurant_lists').values({
        name: 'Private List',
        createdById: userId,
        visibility: 'private'
      }).returning('*');

      // When: User requests sharing URL
      const response = await request(app)
        .get(`/api/lists/${list[0].id}/share-url`)
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      // Then: Error is returned
      expect(response.body.error).toBe('List is not public');
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete().from('circle_members');
    await db.delete().from('circles');
    await db.delete().from('restaurant_lists');
    await db.delete().from('posts');
    await db.delete().from('users');
  });
});