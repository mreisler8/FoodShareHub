import request from 'supertest';
import { app } from '../../server/index';
import { db } from '../../server/db';

describe('List Operations API', () => {
  let userId: number;

  beforeEach(async () => {
    // Set up test database state
    await db.delete().from('restaurant_lists');
    await db.delete().from('users');
    
    // Create test user
    const user = await db.insert().into('users').values({
      username: 'testuser',
      name: 'Test User',
      password: 'hashedpassword'
    }).returning('*');
    userId = user[0].id;
  });

  describe('POST /api/lists', () => {
    it('should create new list', async () => {
      // Given: Valid list data
      const listData = {
        name: 'Best Pizza Places',
        description: 'My favorite pizza spots',
        tags: ['pizza', 'italian'],
        visibility: 'private'
      };

      // When: User creates list
      const response = await request(app)
        .post('/api/lists')
        .set('Authorization', 'Bearer valid-token')
        .send(listData)
        .expect(201);

      // Then: List is created
      expect(response.body.name).toBe('Best Pizza Places');
      expect(response.body.description).toBe('My favorite pizza spots');
      expect(response.body.tags).toEqual(['pizza', 'italian']);
      expect(response.body.visibility).toBe('private');
      expect(response.body.createdById).toBe(userId);
    });

    it('should validate required fields', async () => {
      // Given: Invalid list data (missing name)
      const listData = {
        description: 'Description without name',
        tags: ['tag1']
      };

      // When: User tries to create list
      const response = await request(app)
        .post('/api/lists')
        .set('Authorization', 'Bearer valid-token')
        .send(listData)
        .expect(400);

      // Then: Validation error is returned
      expect(response.body.error).toContain('name');
    });

    it('should check for duplicate list names', async () => {
      // Given: User already has a list with same name
      await db.insert().into('restaurant_lists').values({
        name: 'Duplicate Name',
        createdById: userId,
        visibility: 'private'
      });

      // When: User tries to create list with same name
      const response = await request(app)
        .post('/api/lists')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Duplicate Name', visibility: 'private' })
        .expect(409);

      // Then: Conflict error is returned
      expect(response.body.error).toBe('List name already exists');
    });

    it('should handle different visibility settings', async () => {
      const visibilityOptions = ['private', 'circle', 'public'];

      for (const visibility of visibilityOptions) {
        // When: User creates list with specific visibility
        const response = await request(app)
          .post('/api/lists')
          .set('Authorization', 'Bearer valid-token')
          .send({ 
            name: `${visibility} List`,
            visibility: visibility 
          })
          .expect(201);

        // Then: List is created with correct visibility
        expect(response.body.visibility).toBe(visibility);
      }
    });
  });

  describe('GET /api/lists', () => {
    it('should return user lists', async () => {
      // Given: User has lists
      await db.insert().into('restaurant_lists').values([
        { name: 'List 1', createdById: userId, visibility: 'private' },
        { name: 'List 2', createdById: userId, visibility: 'public' }
      ]);

      // When: User requests their lists
      const response = await request(app)
        .get('/api/lists')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: User lists are returned
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('List 1');
      expect(response.body[1].name).toBe('List 2');
    });

    it('should filter lists by visibility', async () => {
      // Given: Lists with different visibility
      await db.insert().into('restaurant_lists').values([
        { name: 'Private List', createdById: userId, visibility: 'private' },
        { name: 'Public List', createdById: userId, visibility: 'public' }
      ]);

      // When: User requests public lists only
      const response = await request(app)
        .get('/api/lists?visibility=public')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Only public lists are returned
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Public List');
    });

    it('should support pagination', async () => {
      // Given: Many lists
      const lists = Array.from({ length: 15 }, (_, i) => ({
        name: `List ${i + 1}`,
        createdById: userId,
        visibility: 'private'
      }));
      await db.insert().into('restaurant_lists').values(lists);

      // When: User requests paginated lists
      const response = await request(app)
        .get('/api/lists?limit=10&offset=0')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: Paginated results are returned
      expect(response.body).toHaveLength(10);
    });
  });

  describe('GET /api/lists/:id', () => {
    it('should return list details', async () => {
      // Given: List exists
      const list = await db.insert().into('restaurant_lists').values({
        name: 'Test List',
        description: 'Test description',
        createdById: userId,
        visibility: 'private'
      }).returning('*');

      // When: User requests list details
      const response = await request(app)
        .get(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: List details are returned
      expect(response.body.name).toBe('Test List');
      expect(response.body.description).toBe('Test description');
    });

    it('should return 404 for non-existent list', async () => {
      // When: User requests non-existent list
      const response = await request(app)
        .get('/api/lists/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      // Then: Not found error is returned
      expect(response.body.error).toBe('List not found');
    });

    it('should check list permissions', async () => {
      // Given: Private list owned by another user
      const anotherUser = await db.insert().into('users').values({
        username: 'anotheruser',
        name: 'Another User',
        password: 'hashedpassword'
      }).returning('*');

      const list = await db.insert().into('restaurant_lists').values({
        name: 'Private List',
        createdById: anotherUser[0].id,
        visibility: 'private'
      }).returning('*');

      // When: User tries to access private list
      const response = await request(app)
        .get(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      // Then: Forbidden error is returned
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('PUT /api/lists/:id', () => {
    it('should update list', async () => {
      // Given: User owns a list
      const list = await db.insert().into('restaurant_lists').values({
        name: 'Original Name',
        createdById: userId,
        visibility: 'private'
      }).returning('*');

      // When: User updates list
      const response = await request(app)
        .put(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ 
          name: 'Updated Name',
          description: 'Updated description',
          visibility: 'public'
        })
        .expect(200);

      // Then: List is updated
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.visibility).toBe('public');
    });

    it('should check ownership before updating', async () => {
      // Given: List owned by another user
      const anotherUser = await db.insert().into('users').values({
        username: 'anotheruser',
        name: 'Another User',
        password: 'hashedpassword'
      }).returning('*');

      const list = await db.insert().into('restaurant_lists').values({
        name: 'Other User List',
        createdById: anotherUser[0].id,
        visibility: 'private'
      }).returning('*');

      // When: User tries to update other user's list
      const response = await request(app)
        .put(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Hacked Name' })
        .expect(403);

      // Then: Forbidden error is returned
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('DELETE /api/lists/:id', () => {
    it('should delete list', async () => {
      // Given: User owns a list
      const list = await db.insert().into('restaurant_lists').values({
        name: 'List to Delete',
        createdById: userId,
        visibility: 'private'
      }).returning('*');

      // When: User deletes list
      const response = await request(app)
        .delete(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Then: List is deleted
      expect(response.body.success).toBe(true);

      // And: List no longer exists
      const getResponse = await request(app)
        .get(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });

    it('should check ownership before deleting', async () => {
      // Given: List owned by another user
      const anotherUser = await db.insert().into('users').values({
        username: 'anotheruser',
        name: 'Another User',
        password: 'hashedpassword'
      }).returning('*');

      const list = await db.insert().into('restaurant_lists').values({
        name: 'Other User List',
        createdById: anotherUser[0].id,
        visibility: 'private'
      }).returning('*');

      // When: User tries to delete other user's list
      const response = await request(app)
        .delete(`/api/lists/${list[0].id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      // Then: Forbidden error is returned
      expect(response.body.error).toBe('Access denied');
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete().from('restaurant_lists');
    await db.delete().from('users');
  });
});