import request from 'supertest';
import { db } from '../server/db';
import app from '../server/index';

describe('Duplicate List Creation Tests', () => {
  let authCookie: string;
  let testUserId: number;

  beforeAll(async () => {
    // Create a test user and get authentication
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'duplicate-test@example.com',
        password: 'testpassword123',
        name: 'Duplicate Test User'
      });

    testUserId = registerResponse.body.id;

    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'duplicate-test@example.com',
        password: 'testpassword123'
      });

    authCookie = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await db.execute(`DELETE FROM restaurant_lists WHERE created_by_id = ${testUserId}`);
      await db.execute(`DELETE FROM users WHERE id = ${testUserId}`);
    }
  });

  describe('GET /api/lists?name=<name>', () => {
    it('should return empty array when no list with that name exists', async () => {
      const response = await request(app)
        .get('/api/lists?name=NonExistentList')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return list when a list with that name exists', async () => {
      // First create a list
      const createResponse = await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: 'Test Duplicate List',
          description: 'A test list for duplicate checking',
          makePublic: true
        })
        .expect(200);

      const listId = createResponse.body.id;

      // Then query for it by name
      const queryResponse = await request(app)
        .get('/api/lists?name=Test Duplicate List')
        .set('Cookie', authCookie)
        .expect(200);

      expect(queryResponse.body).toHaveLength(1);
      expect(queryResponse.body[0].id).toBe(listId);
      expect(queryResponse.body[0].name).toBe('Test Duplicate List');
    });

    it('should only return lists owned by the authenticated user', async () => {
      // Create another user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2-duplicate@example.com',
          password: 'testpassword123',
          name: 'User 2'
        });

      const user2LoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'user2-duplicate@example.com',
          password: 'testpassword123'
        });

      const user2Cookie = user2LoginResponse.headers['set-cookie'];

      // User 2 creates a list with the same name
      await request(app)
        .post('/api/lists')
        .set('Cookie', user2Cookie)
        .send({
          name: 'Shared Name List',
          description: 'User 2 list',
          makePublic: true
        })
        .expect(200);

      // Original user creates a list with the same name
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: 'Shared Name List',
          description: 'User 1 list',
          makePublic: true
        })
        .expect(200);

      // When original user queries, should only get their own list
      const queryResponse = await request(app)
        .get('/api/lists?name=Shared Name List')
        .set('Cookie', authCookie)
        .expect(200);

      expect(queryResponse.body).toHaveLength(1);
      expect(queryResponse.body[0].description).toBe('User 1 list');

      // Clean up user 2
      await db.execute(`DELETE FROM restaurant_lists WHERE created_by_id = ${user2Response.body.id}`);
      await db.execute(`DELETE FROM users WHERE id = ${user2Response.body.id}`);
    });
  });

  describe('POST /api/lists - Duplicate Detection', () => {
    it('should create list successfully when name is unique', async () => {
      const response = await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: 'Unique List Name',
          description: 'This should work fine',
          makePublic: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Unique List Name');
    });

    it('should return 409 conflict when attempting to create duplicate list', async () => {
      const listName = 'Test Duplicate Creation';

      // Create the first list
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: listName,
          description: 'First list',
          makePublic: true
        })
        .expect(200);

      // Attempt to create a duplicate
      const duplicateResponse = await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: listName,
          description: 'Duplicate list',
          makePublic: true
        })
        .expect(409);

      expect(duplicateResponse.body).toHaveProperty('error', 'duplicate_list');
      expect(duplicateResponse.body).toHaveProperty('existingId');
      expect(typeof duplicateResponse.body.existingId).toBe('number');
    });

    it('should handle case-sensitive duplicate detection', async () => {
      const baseName = 'Case Sensitive Test';

      // Create first list
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: baseName,
          description: 'Original case',
          makePublic: true
        })
        .expect(200);

      // Different case should be allowed (case-sensitive)
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: baseName.toLowerCase(),
          description: 'Lower case version',
          makePublic: true
        })
        .expect(200);

      // Exact case should be rejected
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: baseName,
          description: 'Exact duplicate',
          makePublic: true
        })
        .expect(409);
    });

    it('should handle whitespace in duplicate detection', async () => {
      const listName = 'Whitespace Test';

      // Create first list
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: listName,
          description: 'Original',
          makePublic: true
        })
        .expect(200);

      // Same name with extra whitespace should be rejected
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: `  ${listName}  `,
          description: 'With whitespace',
          makePublic: true
        })
        .expect(409);
    });
  });

  describe('Duplicate Detection Edge Cases', () => {
    it('should allow empty names to be handled gracefully', async () => {
      const response = await request(app)
        .get('/api/lists?name=')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle URL encoding in list names', async () => {
      const listName = 'List with & symbols';

      // Create list
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: listName,
          description: 'Special characters',
          makePublic: true
        })
        .expect(200);

      // Query with URL encoding
      const encodedName = encodeURIComponent(listName);
      const response = await request(app)
        .get(`/api/lists?name=${encodedName}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe(listName);
    });

    it('should handle very long list names', async () => {
      const longName = 'A'.repeat(255); // Very long name

      // Create list with long name
      await request(app)
        .post('/api/lists')
        .set('Cookie', authCookie)
        .send({
          name: longName,
          description: 'Long name test',
          makePublic: true
        })
        .expect(200);

      // Query for it
      const response = await request(app)
        .get(`/api/lists?name=${encodeURIComponent(longName)}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe(longName);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for duplicate checking', async () => {
      await request(app)
        .get('/api/lists?name=TestList')
        .expect(401);
    });

    it('should require authentication for list creation', async () => {
      await request(app)
        .post('/api/lists')
        .send({
          name: 'Unauthorized List',
          description: 'Should fail',
          makePublic: true
        })
        .expect(401);
    });
  });
});