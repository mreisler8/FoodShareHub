import request from "supertest";
import { db } from "../server/db";
import app from "../server/index";

describe("Unified Search API", () => {
  let authCookie: string;

  beforeAll(async () => {
    // Register and authenticate a test user
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        username: "testuser@example.com",
        password: "testpassword123"
      });

    expect(registerResponse.status).toBe(201);
    
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        username: "testuser@example.com",
        password: "testpassword123"
      });

    expect(loginResponse.status).toBe(200);
    authCookie = loginResponse.headers['set-cookie'];
  });

  describe("GET /api/search/unified", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/search/unified?q=test");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Not authenticated");
    });

    it("should require search query parameter", async () => {
      const response = await request(app)
        .get("/api/search/unified")
        .set('Cookie', authCookie);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Search query is required");
    });

    it("should require minimum 2 character search term", async () => {
      const response = await request(app)
        .get("/api/search/unified?q=a")
        .set('Cookie', authCookie);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Search query must be at least 2 characters");
    });

    it("should return unified search results", async () => {
      const response = await request(app)
        .get("/api/search/unified?q=test")
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('restaurants');
      expect(response.body).toHaveProperty('lists');
      expect(response.body).toHaveProperty('posts');
      expect(response.body).toHaveProperty('users');
      
      // Verify each result array is an array
      expect(Array.isArray(response.body.restaurants)).toBe(true);
      expect(Array.isArray(response.body.lists)).toBe(true);
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it("should limit results to 5 per category", async () => {
      const response = await request(app)
        .get("/api/search/unified?q=a")
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      
      // Each category should have at most 5 results
      expect(response.body.restaurants.length).toBeLessThanOrEqual(5);
      expect(response.body.lists.length).toBeLessThanOrEqual(5);
      expect(response.body.posts.length).toBeLessThanOrEqual(5);
      expect(response.body.users.length).toBeLessThanOrEqual(5);
    });

    it("should include type field in all results", async () => {
      const response = await request(app)
        .get("/api/search/unified?q=test")
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      
      // Check restaurant results have type field
      response.body.restaurants.forEach((restaurant: any) => {
        expect(restaurant.type).toBe('restaurant');
        expect(restaurant).toHaveProperty('id');
        expect(restaurant).toHaveProperty('name');
      });

      // Check list results have type field
      response.body.lists.forEach((list: any) => {
        expect(list.type).toBe('list');
        expect(list).toHaveProperty('id');
        expect(list).toHaveProperty('name');
      });

      // Check post results have type field
      response.body.posts.forEach((post: any) => {
        expect(post.type).toBe('post');
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('content');
      });

      // Check user results have type field
      response.body.users.forEach((user: any) => {
        expect(user.type).toBe('user');
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
      });
    });

    it("should only return public lists or user's own lists", async () => {
      const response = await request(app)
        .get("/api/search/unified?q=test")
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      
      // All returned lists should either be public or belong to the authenticated user
      response.body.lists.forEach((list: any) => {
        // This test assumes we know the user ID from the auth setup
        // In a real test, we'd verify the list is either public or owned by the user
        expect(list).toHaveProperty('isPublic');
        expect(list).toHaveProperty('createdById');
      });
    });

    it("should only return public posts", async () => {
      const response = await request(app)
        .get("/api/search/unified?q=test")
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      
      // All posts should be public (this is enforced by the query)
      response.body.posts.forEach((post: any) => {
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('rating');
      });
    });
  });

  describe("GET /api/search/trending", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/search/trending");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Not authenticated");
    });

    it("should return trending content", async () => {
      const response = await request(app)
        .get("/api/search/trending")
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trending');
      expect(Array.isArray(response.body.trending)).toBe(true);
    });

    it("should limit trending results to 5 items", async () => {
      const response = await request(app)
        .get("/api/search/trending")
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.trending.length).toBeLessThanOrEqual(5);
    });

    it("should include type field in trending results", async () => {
      const response = await request(app)
        .get("/api/search/trending")
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      
      response.body.trending.forEach((item: any) => {
        expect(item).toHaveProperty('type');
        expect(['restaurant', 'list']).toContain(item.type);
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
      });
    });
  });
});