import request from 'supertest';
import { setupTestApp } from './setup';

describe('Authentication API', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  describe('POST /api/register', () => {
    const validUser = {
      username: 'test-register@example.com',
      password: 'testpassword123',
      name: 'Test User'
    };

    it('should register new user with 201 status', async () => {
      const response = await request(app)
        .post('/api/register')
        .send(validUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(validUser.username);
      expect(response.body.name).toBe(validUser.name);
      expect(response.body).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should reject duplicate email with 409 status', async () => {
      // First registration
      await request(app)
        .post('/api/register')
        .send(validUser)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/register')
        .send(validUser)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should reject invalid email format with 400 status', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          ...validUser,
          username: 'invalid-email'
        })
        .expect(400);

      expect(response.body.error).toContain('valid email');
    });

    it('should reject missing required fields with 400 status', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: validUser.username
          // Missing password and name
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/login', () => {
    const testUser = {
      username: 'test-login@example.com',
      password: 'testpassword123',
      name: 'Login Test User'
    };

    beforeEach(async () => {
      // Register test user
      await request(app)
        .post('/api/register')
        .send(testUser);
    });

    it('should login with correct credentials and return 200', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(testUser.username);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should set authentication cookie on successful login', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('connect.sid');
    });

    it('should allow authenticated user to access /api/me', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      // Extract cookie
      const cookies = loginResponse.headers['set-cookie'];

      // Access protected route
      const meResponse = await request(app)
        .get('/api/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(meResponse.body.username).toBe(testUser.username);
    });

    it('should reject incorrect password with 401 status', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toContain('password');
    });

    it('should reject non-existent user with 401 status', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistent@example.com',
          password: 'anypassword'
        })
        .expect(401);

      expect(response.body.error).toContain('account');
    });

    it('should reject invalid email format with 401 status', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'invalid-email',
          password: 'anypassword'
        })
        .expect(401);

      expect(response.body.error).toContain('email');
    });
  });
});